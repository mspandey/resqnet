'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { ResQNetSidebarBrand } from '@/components/ui/ResQNetLogo';
import { ThemeSwitch } from '@/components/ui/ThemeSwitch';

const NAV_LINKS = [
  { label: 'Features',     href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Impact',       href: '#impact' },
  { label: 'About',        href: '#about' },
  { label: 'Contact',      href: '#contact' },
];

const LOGIN_ITEMS  = [{ label:'Citizen Login',  href:'/citizen/login'  },{ label:'Volunteer Login', href:'/volunteer/login' }];
const SIGNUP_ITEMS = [{ label:'Citizen Sign Up',href:'/citizen/signup' },{ label:'Volunteer Sign Up',href:'/volunteer/signup'}];

function Dropdown({ label, items, accent }: { label:string; items:{label:string;href:string}[]; accent?:boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e:MouseEvent) => { if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all"
        style={accent
          ? {background:'#CC2229', color:'white', boxShadow:'0 0 20px rgba(204,34,41,0.3)'}
          : {color:'#94a3b8', background:'transparent'}}
      >
        {label} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open?'rotate-180':''}`}/>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl p-1.5 z-50 shadow-2xl"
          style={{background:'rgba(15,28,63,0.98)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(20px)'}}>
          {items.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:text-white"
              style={{color:'#94a3b8'}}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(204,34,41,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar({ theme, onToggleTheme }: { theme:'light'|'dark'; onToggleTheme:()=>void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(6,14,34,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}>
      <nav className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-0" style={{minHeight:'auto', minWidth:'auto'}}>
          <ResQNetSidebarBrand />
        </Link>
        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}
              className="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{color:'#94a3b8', minHeight:'auto', minWidth:'auto'}}
              onMouseEnter={e => (e.currentTarget.style.color='white')}
              onMouseLeave={e => (e.currentTarget.style.color='#94a3b8')}>
              {l.label}
            </a>
          ))}
        </div>
        {/* Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeSwitch isDark={theme === 'dark'} onToggle={onToggleTheme} />
          <Dropdown label="Login" items={LOGIN_ITEMS}/>
          <Dropdown label="Sign Up" items={SIGNUP_ITEMS} accent/>
        </div>
        {/* Mobile toggle */}
        <button className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl" style={{color:'white', background:'rgba(255,255,255,0.08)', minHeight:'auto', minWidth:'auto'}} onClick={() => setMobileOpen(o=>!o)} aria-label="Menu">
          {mobileOpen ? <X className="w-4 h-4"/> : <Menu className="w-4 h-4"/>}
        </button>
      </nav>
      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden px-6 pb-6 pt-2" style={{background:'rgba(6,14,34,0.98)', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="space-y-1 mb-4">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium rounded-xl" style={{color:'#94a3b8'}}>{l.label}</a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-4" style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            {[...LOGIN_ITEMS, ...SIGNUP_ITEMS].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="text-center rounded-xl px-3 py-2.5 text-xs font-semibold" style={{background:'rgba(255,255,255,0.06)', color:'white'}}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer id="contact" style={{background:'#040b18', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <ResQNetSidebarBrand className="mb-4"/>
            <p className="text-sm leading-relaxed max-w-xs" style={{color:'#475569'}}>
              India&apos;s premier real-time disaster coordination platform — built for citizens, volunteers, and emergency authorities.
            </p>
          </div>
          {[
            { heading:'Platform', links:[['Features','#features'],['How It Works','#how-it-works'],['Impact','#impact']] },
            { heading:'Portals',  links:[['Citizen Login','/citizen/login'],['Volunteer Login','/volunteer/login'],['Citizen Sign Up','/citizen/signup'],['Volunteer Sign Up','/volunteer/signup']] },
            { heading:'Company',  links:[['About','#about'],['Contact','#contact'],['Privacy','#'],['Terms','#']] },
          ].map(col => (
            <div key={col.heading}>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{color:'#CC2229'}}>{col.heading}</h4>
              <ul className="space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm transition-colors" style={{color:'#475569'}}
                      onMouseEnter={e => (e.currentTarget.style.color='white')}
                      onMouseLeave={e => (e.currentTarget.style.color='#475569')}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <p className="text-xs" style={{color:'#334155'}}>© 2026 ResQNet. All rights reserved.</p>
          <p className="text-xs" style={{color:'#334155'}}>Respond. Connect. Save Lives.</p>
        </div>
      </div>
    </footer>
  );
}
