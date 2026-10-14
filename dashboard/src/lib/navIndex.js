import {
  BarChart3, Activity, Key, Users, ShoppingCart, Package,
  Plus, Upload, MessageSquare, Tag, AlertTriangle, Clock,
  Settings, Globe, Server, Gamepad2, Skull, TrendingUp,
  UserCheck, Store, Cpu, Box, Sparkles, Bug, Star,
} from 'lucide-react';

// ══════════════════════════════════════════════════════
//  Single source of truth for dashboard navigation.
//  Sidebar renders NAV_GROUPS (collapsible sections);
//  CommandPalette (⌘K) searches the flattened NAV_INDEX.
// ══════════════════════════════════════════════════════
export const NAV_GROUPS = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    items: [
      { icon: BarChart3, label: 'Dashboard',     p: '/' },
      { icon: Activity,  label: 'Analytiques',   p: '/analytics' },
      { icon: Globe,     label: 'Activité site', p: '/activity' },
      { icon: TrendingUp, label: 'Metrics',      p: '/metrics' },
    ],
  },
  {
    id: 'sales',
    label: 'Ventes',
    items: [
      { icon: Key,          label: 'Licences',    p: '/licenses' },
      { icon: Users,        label: 'Utilisateurs', p: '/customers' },
      { icon: ShoppingCart, label: 'Commandes',   p: '/orders' },
      { icon: Tag,          label: 'Codes Promo', p: '/promo-codes' },
      { icon: UserCheck,    label: 'Affiliés',    p: '/affiliates' },
      { icon: Store,        label: 'Resellers',   p: '/resellers' },
    ],
  },
  {
    id: 'products',
    label: 'Produits',
    items: [
      { icon: Package,       label: 'Plans',       p: '/plans-hub' },
      { icon: Plus,          label: 'Générer',     p: '/generate' },
      { icon: Upload,        label: 'Upload',      p: '/upload' },
      { icon: Gamepad2,      label: 'Shop',        p: '/shop-content' },
      { icon: Star,          label: 'Avis clients', p: '/shop-reviews' },
      { icon: Sparkles,      label: 'Pokémon',     p: '/pokemon' },
      { icon: Server,        label: 'Serveurs',    p: '/servers' },
      { icon: MessageSquare, label: 'Bot Discord', p: '/bot' },
      { icon: Box,           label: 'Minecraft',   p: '/minecraft' },
    ],
  },
  {
    id: 'security',
    label: 'Sécurité / Debug',
    items: [
      { icon: Cpu,           label: 'Kernel Symbols', p: '/kernel-symbols' },
      { icon: Bug,           label: 'Crash Reports',  p: '/crash-dumps' },
      { icon: Skull,         label: 'Kill Switch',    p: '/kill-switch' },
      { icon: AlertTriangle, label: 'IPs Bloquées',   p: '/blocked-ips' },
      { icon: Clock,         label: 'Logs',           p: '/logs' },
    ],
  },
  {
    id: 'system',
    label: 'Système',
    items: [
      { icon: Settings, label: 'Paramètres', p: '/settings' },
    ],
  },
];

export const NAV_INDEX = NAV_GROUPS.flatMap(g => g.items);
