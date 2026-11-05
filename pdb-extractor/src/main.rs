use pdb::{FallibleIterator, PDB, SymbolData, TypeData};
use std::collections::HashMap;
use std::env;
use std::fs::File;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("usage: pdb_extractor <path.pdb> <spec> [<spec> ...]");
        eprintln!("  spec: <SymbolName>                       — public symbol RVA");
        eprintln!("  spec: <Alias>=udt:<TypeName>.<FieldName> — UDT field offset");
        std::process::exit(1);
    }
    let pdb_path = &args[1];
    let specs: Vec<&str> = args[2..].iter().map(|s| s.as_str()).collect();

    // Split specs: plain names → public symbol, "alias=udt:T.F" → field offset
    let mut wanted_public: Vec<&str> = Vec::new();
    let mut wanted_fields: Vec<(String, String, String)> = Vec::new(); // (alias, type, field)
    for s in &specs {
        if let Some((alias, spec)) = s.split_once('=') {
            if let Some(udt) = spec.strip_prefix("udt:") {
                if let Some((ty, field)) = udt.split_once('.') {
                    wanted_fields.push((alias.to_string(), ty.to_string(), field.to_string()));
                    continue;
                }
            }
        }
        wanted_public.push(s);
    }

    let file = File::open(pdb_path)?;
    let mut pdb = PDB::open(file)?;

    let mut out: HashMap<String, u64> = HashMap::new();

    // ── Public symbols → RVA ───────────────────────────────────────
    {
        let symbol_table = pdb.global_symbols()?;
        let address_map = pdb.address_map()?;
        let mut syms = symbol_table.iter();
        while let Some(symbol) = syms.next()? {
            if let Ok(SymbolData::Public(data)) = symbol.parse() {
                let name = data.name.to_string();
                if wanted_public.iter().any(|w| *w == name) {
                    if let Some(rva) = data.offset.to_rva(&address_map) {
                        out.insert(name.into_owned(), rva.0 as u64);
                    }
                }
            }
        }
    }

    // ── UDT field offsets ──────────────────────────────────────────
    if !wanted_fields.is_empty() {
        let type_info = pdb.type_information()?;

        // Pass 1: build a complete TypeFinder so we can resolve any
        // FieldList referenced by a Class even if it appears later in
        // the stream (rare but happens in multi-module PDBs).
        let mut finder = type_info.finder();
        {
            let mut iter = type_info.iter();
            while iter.next()?.is_some() {
                finder.update(&iter);
            }
        }

        // Pass 2: find each wanted (type, field) pair.
        let mut iter = type_info.iter();
        while let Some(typ) = iter.next()? {
            let parsed = match typ.parse() { Ok(p) => p, Err(_) => continue };
            let (name, fields_idx) = match parsed {
                TypeData::Class(c) => (c.name, c.fields),
                TypeData::Union(u) => (u.name, Some(u.fields)),
                _ => continue,
            };
            let name_str = name.to_string();

            // Collect which wanted fields match this type
            let matching: Vec<&(String, String, String)> = wanted_fields
                .iter()
                .filter(|(_, ty, _)| ty.as_str() == name_str.as_ref())
                .collect();
            if matching.is_empty() { continue; }

            // Resolve FieldList (forward-decl classes have fields=None, skip them)
            let fidx = match fields_idx { Some(i) => i, None => continue };
            let flist_type = match finder.find(fidx) { Ok(t) => t, Err(_) => continue };
            let flist = match flist_type.parse() {
                Ok(TypeData::FieldList(f)) => f,
                _ => continue,
            };

            for f in flist.fields {
                if let TypeData::Member(m) = f {
                    let fname = m.name.to_string();
                    for (alias, _, wanted_field) in &matching {
                        if wanted_field.as_str() == fname.as_ref() {
                            // Only insert first match (skips forward-decl duplicates)
                            out.entry(alias.clone()).or_insert(m.offset);
                        }
                    }
                }
            }
        }
    }

    println!("{}", serde_json::to_string(&out)?);
    Ok(())
}
