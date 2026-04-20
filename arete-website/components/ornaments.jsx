// Classical gold-leaf ornaments: rules, flourishes, columns, monograms.
// All drawn as inline SVG so they scale and change color cleanly.

function GoldRule({ width = 320, variant = 'diamond' }) {
  // thin gold rule with a center ornament
  const gold = '#c9a84c';
  if (variant === 'diamond') {
    return (
      <svg width={width} height="14" viewBox={`0 0 ${width} 14`} style={{ display: 'block' }}>
        <line x1="0" y1="7" x2={width/2 - 16} y2="7" stroke={gold} strokeWidth="0.7" opacity="0.55"/>
        <line x1={width/2 + 16} y1="7" x2={width} y2="7" stroke={gold} strokeWidth="0.7" opacity="0.55"/>
        <g transform={`translate(${width/2}, 7)`}>
          <path d="M-10 0 L0 -5 L10 0 L0 5 Z" fill="none" stroke={gold} strokeWidth="0.8"/>
          <circle cx="0" cy="0" r="1.6" fill={gold}/>
        </g>
      </svg>
    );
  }
  if (variant === 'flourish') {
    return (
      <svg width={width} height="24" viewBox={`0 0 ${width} 24`} style={{ display: 'block' }}>
        <line x1="0" y1="12" x2={width/2 - 40} y2="12" stroke={gold} strokeWidth="0.6" opacity="0.45"/>
        <line x1={width/2 + 40} y1="12" x2={width} y2="12" stroke={gold} strokeWidth="0.6" opacity="0.45"/>
        <g transform={`translate(${width/2}, 12)`} fill="none" stroke={gold} strokeWidth="0.9" strokeLinecap="round">
          <path d="M-36 0 Q -28 -6 -20 0 Q -14 6 -8 0" />
          <path d="M36 0 Q 28 -6 20 0 Q 14 6 8 0" />
          <circle cx="0" cy="0" r="3" />
          <circle cx="0" cy="0" r="1" fill={gold}/>
        </g>
      </svg>
    );
  }
  // simple
  return (
    <div style={{ width, height: 1, background: `linear-gradient(90deg, transparent, ${gold}88, transparent)` }}/>
  );
}

function Monogram({ size = 56 }) {
  // Stylized "A" monogram — pediment + columns
  const gold = '#c9a84c';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {/* pediment */}
      <path d="M10 26 L32 8 L54 26 Z" fill={gold}/>
      {/* columns */}
      <rect x="14" y="28" width="7" height="26" fill={gold}/>
      <rect x="28.5" y="28" width="7" height="26" fill={gold}/>
      <rect x="43" y="28" width="7" height="26" fill={gold}/>
      {/* base */}
      <rect x="10" y="56" width="44" height="3" fill={gold}/>
    </svg>
  );
}

function Pediment({ width = 1200, height = 80 }) {
  // Greek key / meander at top — decorative
  const gold = '#c9a84c';
  const unit = 16;
  const keys = Math.floor(width / (unit * 4));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin slice">
      <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke={gold} strokeWidth="0.7" opacity="0.4"/>
      <g fill="none" stroke={gold} strokeWidth="0.8" opacity="0.45">
        {Array.from({ length: keys }).map((_, i) => {
          const x = i * unit * 4 + (width - keys * unit * 4) / 2;
          const y = height - 18;
          return (
            <path key={i} d={`M${x} ${y + 14} L${x} ${y} L${x + unit*3} ${y} L${x + unit*3} ${y + 8} L${x + unit} ${y + 8} L${x + unit} ${y + 4} L${x + unit*2} ${y + 4}`} />
          );
        })}
      </g>
    </svg>
  );
}

function Column({ height = 420, flute = true }) {
  const gold = '#c9a84c';
  const w = 48;
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="col-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6f27"/>
          <stop offset="0.45" stopColor="#e3c77a"/>
          <stop offset="1" stopColor="#8a6f27"/>
        </linearGradient>
      </defs>
      {/* capital */}
      <rect x="2" y="0" width={w-4} height="14" fill="url(#col-grad)"/>
      <rect x="6" y="14" width={w-12} height="6" fill="url(#col-grad)"/>
      {/* shaft */}
      <rect x="10" y="20" width={w-20} height={height - 40} fill="url(#col-grad)"/>
      {/* flutes */}
      {flute && Array.from({ length: 3 }).map((_, i) => (
        <line key={i} x1={14 + i * 6} y1="22" x2={14 + i * 6} y2={height - 22} stroke={gold} strokeWidth="0.3" opacity="0.4"/>
      ))}
      {/* base */}
      <rect x="6" y={height - 20} width={w-12} height="6" fill="url(#col-grad)"/>
      <rect x="2" y={height - 14} width={w-4} height="14" fill="url(#col-grad)"/>
    </svg>
  );
}

function Ornament({ variant = 'sun', size = 40 }) {
  const gold = '#c9a84c';
  if (variant === 'sun') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) * Math.PI / 180;
          const x1 = 20 + Math.cos(a) * 10;
          const y1 = 20 + Math.sin(a) * 10;
          const x2 = 20 + Math.cos(a) * 18;
          const y2 = 20 + Math.sin(a) * 18;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gold} strokeWidth="0.8" strokeLinecap="round"/>;
        })}
        <circle cx="20" cy="20" r="6" fill="none" stroke={gold} strokeWidth="0.9"/>
        <circle cx="20" cy="20" r="2" fill={gold}/>
      </svg>
    );
  }
  if (variant === 'moon') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40">
        <path d="M26 8 a 14 14 0 1 0 0 24 a 11 11 0 1 1 0 -24 Z" fill="none" stroke={gold} strokeWidth="1"/>
      </svg>
    );
  }
  if (variant === 'laurel') {
    return (
      <svg width={size*2} height={size} viewBox={`0 0 ${size*2} ${size}`}>
        <g fill="none" stroke={gold} strokeWidth="0.8">
          {/* left branch */}
          <path d={`M${size-4} ${size/2} Q ${size/2} ${size/2 - 4} 6 ${size/2}`}/>
          {[...Array(5)].map((_, i) => {
            const x = 8 + i * (size/2 - 8) / 5;
            const y = size/2 + 2;
            return <path key={'l'+i} d={`M${x} ${y} Q ${x-3} ${y+5} ${x-6} ${y+2}`} fill={`${gold}44`}/>;
          })}
          {[...Array(5)].map((_, i) => {
            const x = 8 + i * (size/2 - 8) / 5;
            const y = size/2 - 2;
            return <path key={'l2'+i} d={`M${x} ${y} Q ${x-3} ${y-5} ${x-6} ${y-2}`} fill={`${gold}44`}/>;
          })}
          {/* right branch */}
          <path d={`M${size+4} ${size/2} Q ${size*1.5} ${size/2 - 4} ${size*2 - 6} ${size/2}`}/>
          {[...Array(5)].map((_, i) => {
            const x = size*2 - 8 - i * (size/2 - 8) / 5;
            const y = size/2 + 2;
            return <path key={'r'+i} d={`M${x} ${y} Q ${x+3} ${y+5} ${x+6} ${y+2}`} fill={`${gold}44`}/>;
          })}
          {[...Array(5)].map((_, i) => {
            const x = size*2 - 8 - i * (size/2 - 8) / 5;
            const y = size/2 - 2;
            return <path key={'r2'+i} d={`M${x} ${y} Q ${x+3} ${y-5} ${x+6} ${y-2}`} fill={`${gold}44`}/>;
          })}
        </g>
        <circle cx={size} cy={size/2} r="4" fill={gold}/>
      </svg>
    );
  }
  return null;
}

Object.assign(window, { GoldRule, Monogram, Pediment, Column, Ornament });
