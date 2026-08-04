use pdb::{FallibleIterator, PDB, SymbolData};
use std::collections::HashMap;
use std::env;
use std::fs::File;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("usage: pdb_extractor <path.pdb> <sym1> <sym2> ...");
        std::process::exit(1);
    }
    let pdb_path = &args[1];
    let wanted: Vec<&str> = args[2..].iter().map(|s| s.as_str()).collect();

    let file = File::open(pdb_path)?;
    let mut pdb = PDB::open(file)?;
    let symbol_table = pdb.global_symbols()?;
    let address_map = pdb.address_map()?;

    let mut out: HashMap<String, u32> = HashMap::new();
    let mut syms = symbol_table.iter();
    while let Some(symbol) = syms.next()? {
        if let Ok(SymbolData::Public(data)) = symbol.parse() {
            let name = data.name.to_string();
            if wanted.iter().any(|w| *w == name) {
                if let Some(rva) = data.offset.to_rva(&address_map) {
                    out.insert(name.into_owned(), rva.0);
                }
            }
        }
    }

    println!("{}", serde_json::to_string(&out)?);
    Ok(())
}
