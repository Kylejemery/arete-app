// SVG marble-bust silhouettes for counselors. Duotone: navy + gold.
// Each bust is a stylized profile using simple paths — intentionally abstract,
// like a museum audio guide icon. Silhouettes differ by hair/beard/headwear.

function MarbleBust({ slug, size = 180, variant = 'plate' }) {
  // variant: 'plate' (gold on dark circle) | 'engraving' (line art) | 'relief' (raised)
  const paths = BUST_PATHS[slug] || BUST_PATHS.generic;
  const gold = '#c9a84c';
  const goldLight = '#e3c77a';
  const navy = '#0f1629';
  const navyDeep = '#080d1c';

  if (variant === 'engraving') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200">
        <defs>
          <linearGradient id={`eng-${slug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={goldLight}/>
            <stop offset="1" stopColor={gold}/>
          </linearGradient>
        </defs>
        <g fill="none" stroke={`url(#eng-${slug})`} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
          {paths.outline.map((d, i) => <path key={i} d={d}/>)}
        </g>
      </svg>
    );
  }

  if (variant === 'relief') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200">
        <defs>
          <radialGradient id={`rel-bg-${slug}`} cx="0.35" cy="0.25">
            <stop offset="0" stopColor="#f4ead5"/>
            <stop offset="1" stopColor="#c9a84c"/>
          </radialGradient>
          <linearGradient id={`rel-sh-${slug}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(0,0,0,0)"/>
            <stop offset="1" stopColor="rgba(0,0,0,0.3)"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="200" height="200" fill={`url(#rel-bg-${slug})`}/>
        <g fill="rgba(15,22,41,0.28)">
          {paths.outline.map((d, i) => <path key={i} d={d} transform="translate(2,2)"/>)}
        </g>
        <g fill="rgba(15,22,41,0.78)">
          {paths.outline.map((d, i) => <path key={i} d={d}/>)}
        </g>
        <rect x="0" y="0" width="200" height="200" fill={`url(#rel-sh-${slug})`} style={{mixBlendMode: 'multiply'}}/>
      </svg>
    );
  }

  // Plate (default): gold silhouette on midnight with gold ring
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <radialGradient id={`pl-bg-${slug}`} cx="0.5" cy="0.4">
          <stop offset="0" stopColor="#1a2545"/>
          <stop offset="1" stopColor={navyDeep}/>
        </radialGradient>
        <linearGradient id={`pl-fg-${slug}`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={goldLight}/>
          <stop offset="0.6" stopColor={gold}/>
          <stop offset="1" stopColor="#a0832e"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill={`url(#pl-bg-${slug})`}/>
      <circle cx="100" cy="100" r="96" fill="none" stroke={gold} strokeWidth="1" opacity="0.5"/>
      <circle cx="100" cy="100" r="90" fill="none" stroke={gold} strokeWidth="0.4" opacity="0.3"/>
      <g fill={`url(#pl-fg-${slug})`}>
        {paths.outline.map((d, i) => <path key={i} d={d}/>)}
      </g>
    </svg>
  );
}

// Stylized profile silhouettes. Face looks right. Hair/beard differ.
// All drawn in the same 200x200 box, facing right, shoulders at bottom.
const BUST_PATHS = {
  'marcus-aurelius': {
    // Laurel wreath, curly beard, Roman profile
    outline: [
      // shoulders / toga
      "M40 200 L40 168 Q50 156 60 150 Q80 142 90 148 L110 148 Q124 142 142 150 Q156 158 160 170 L160 200 Z",
      // neck
      "M90 148 L90 128 Q100 124 110 128 L110 148 Z",
      // head + jaw (profile facing right)
      "M82 128 Q72 118 72 100 Q72 78 84 66 Q96 52 116 52 Q134 54 142 68 Q150 82 148 102 L146 116 Q144 124 136 126 L132 130 Q132 138 128 142 Q122 148 110 148 L92 148 Q86 144 84 138 Z",
      // laurel wreath — leaves around top
      "M78 62 Q74 56 68 58 Q72 64 78 62 Z",
      "M88 54 Q84 48 78 50 Q82 56 88 54 Z",
      "M100 48 Q96 42 90 44 Q94 50 100 48 Z",
      "M114 46 Q112 40 106 42 Q108 48 114 46 Z",
      "M128 50 Q128 44 122 44 Q124 50 128 50 Z",
      "M140 58 Q142 52 136 50 Q136 58 140 58 Z",
      "M148 70 Q152 64 146 60 Q144 68 148 70 Z",
      // beard (below jaw)
      "M108 136 Q104 146 106 156 Q100 158 96 152 Q98 142 102 138 Z",
      "M116 138 Q118 148 114 158 Q122 156 124 148 Q124 142 120 138 Z",
    ],
  },
  'epictetus': {
    // Thin, hollow-cheeked, unkempt long beard
    outline: [
      "M38 200 L38 172 Q50 158 66 154 L94 152 Q108 148 118 152 L142 156 Q156 162 162 174 L162 200 Z",
      "M92 152 L92 130 Q102 126 112 130 L112 152 Z",
      "M82 132 Q70 120 70 96 Q70 72 84 58 Q100 46 120 50 Q140 58 146 78 Q150 94 146 110 L142 122 Q138 128 132 130 Q130 138 124 144 Q118 150 108 150 L94 150 Q86 146 84 140 Z",
      // receding hairline — bald top
      "M88 58 Q96 52 108 52 Q120 54 128 62",
      // long beard tapering down
      "M102 142 Q96 160 98 180 Q104 190 110 192 Q118 188 120 176 Q122 158 118 142 Z",
      // deep-set eye (small notch)
      "M124 96 Q130 94 132 100",
    ],
  },
  'david-goggins': {
    // Modern: bald, strong jaw, no beard
    outline: [
      "M36 200 L36 164 Q44 150 60 144 L86 140 L124 140 L150 146 Q164 154 168 168 L168 200 Z",
      "M92 140 L92 120 Q102 118 112 120 L112 140 Z",
      // bald head, strong angular profile
      "M80 122 Q72 110 72 92 Q72 72 82 60 Q94 50 114 50 Q134 52 144 66 Q152 80 150 98 L148 114 Q144 122 136 124 Q134 130 128 134 Q120 140 110 140 L92 140 Q86 136 84 130 Z",
      // jaw emphasis
      "M120 134 L132 128",
      // ear
      "M138 98 Q146 100 146 108 Q144 114 138 112 Z",
    ],
  },
  'theodore-roosevelt': {
    // Round glasses, mustache, side-part hair
    outline: [
      "M38 200 L38 166 Q50 152 66 148 L90 146 L122 146 L150 150 Q164 158 168 172 L168 200 Z",
      "M92 146 L92 124 Q102 122 112 124 L112 146 Z",
      "M80 124 Q70 112 70 92 Q70 72 82 60 Q96 48 116 50 Q136 54 144 72 Q150 86 148 104 L146 118 Q142 126 134 128 Q132 134 126 138 Q118 144 108 144 L92 144 Q86 140 84 134 Z",
      // hair — side-parted, full on top
      "M82 62 Q88 52 102 50 Q118 48 130 56 Q142 64 144 76 Q136 70 124 68 Q110 66 96 70 Q86 74 82 82 Z",
      // round glasses (pince-nez)
      "M122 96 Q130 94 134 100 Q132 108 124 106 Q120 100 122 96 Z",
      // mustache
      "M108 120 Q114 116 122 118 Q130 116 136 120 Q130 124 122 122 Q114 124 108 120 Z",
    ],
  },
  'future-self': {
    // Abstract: geometric silhouette, no features — a mirror
    outline: [
      "M40 200 L40 168 Q52 154 70 150 L92 148 L116 148 L140 152 Q158 160 162 174 L162 200 Z",
      "M94 148 L94 126 Q104 122 114 126 L114 148 Z",
      "M84 130 Q74 118 74 98 Q74 76 88 62 Q102 50 120 52 Q138 56 146 74 Q150 90 146 108 L142 122 Q138 128 132 130 Q130 136 124 140 Q116 146 108 146 L94 146 Q88 142 86 136 Z",
    ],
  },
  'buddha': {
    // Top-knot (ushnisha), long earlobes, serene
    outline: [
      "M40 200 L40 172 Q52 158 70 154 L92 152 L120 152 L146 156 Q160 164 164 176 L164 200 Z",
      "M92 152 L92 132 Q102 128 112 132 L112 152 Z",
      "M82 132 Q72 120 72 100 Q72 80 82 66 Q96 52 116 54 Q138 58 146 76 Q152 92 148 110 L144 124 Q140 130 134 132 Q132 138 126 142 Q118 148 108 148 L92 148 Q86 144 84 138 Z",
      // ushnisha — top knot
      "M100 52 Q108 40 116 46 Q118 52 114 56 Q106 58 100 54 Z",
      // long earlobe
      "M140 102 Q148 106 148 120 Q146 130 140 128 Z",
    ],
  },
  'churchill': {
    // Round head, cigar
    outline: [
      "M36 200 L36 164 Q42 148 58 142 L86 138 L128 138 L156 144 Q170 154 170 170 L170 200 Z",
      "M94 138 L94 118 Q104 116 114 118 L114 138 Z",
      // round full head
      "M80 120 Q72 108 72 90 Q74 72 86 62 Q102 52 120 54 Q140 58 148 74 Q152 88 150 104 L148 116 Q144 124 136 126 Q134 132 128 136 Q120 140 112 140 L94 140 Q86 136 84 128 Z",
      // balding top
      "M88 64 Q102 58 120 60",
      // cigar
      "M132 120 L152 124 L152 128 L132 126 Z",
      // jowls
      "M96 132 Q98 138 92 140",
    ],
  },
  'lincoln': {
    // Tall forehead, chin beard (no mustache), sunken cheeks
    outline: [
      "M36 200 L36 168 Q46 154 62 148 L88 144 L124 148 L152 152 Q166 160 168 174 L168 200 Z",
      "M92 144 L92 122 Q102 120 112 122 L112 144 Z",
      // angular, tall head
      "M80 124 Q68 110 68 88 Q68 66 80 54 Q96 42 118 46 Q138 52 146 72 Q150 90 144 108 L140 122 Q136 128 130 130 Q128 138 120 144 Q108 148 94 146 Q86 142 84 134 Z",
      // dark hair
      "M78 58 Q86 48 100 46 Q118 44 132 54 Q142 64 144 78 Q136 72 122 68 Q106 64 90 70 Q82 76 80 86 Z",
      // chin beard (no mustache)
      "M104 144 Q102 158 106 172 Q112 176 118 170 Q120 158 116 144 Z",
    ],
  },
  'mandela': {
    // Short white hair, wise elder
    outline: [
      "M38 200 L38 168 Q48 154 64 148 L90 144 L124 144 L150 150 Q164 158 168 172 L168 200 Z",
      "M94 144 L94 122 Q104 120 114 122 L114 144 Z",
      "M82 124 Q72 112 72 92 Q72 72 84 60 Q98 48 118 50 Q138 54 146 72 Q150 88 148 104 L146 118 Q142 126 134 128 Q132 134 126 138 Q118 144 108 144 L94 144 Q86 140 84 132 Z",
      // short hair cap
      "M80 62 Q96 54 118 54 Q136 58 144 70",
    ],
  },
  'rumi': {
    // Turban, long beard
    outline: [
      "M36 200 L36 170 Q48 156 64 152 L92 150 L122 150 L150 154 Q166 164 168 176 L168 200 Z",
      "M94 150 L94 128 Q104 126 114 128 L114 150 Z",
      "M84 128 Q74 116 74 96 Q74 78 84 66 Q98 54 118 56 Q138 60 144 78 Q148 94 144 108 L140 120 Q136 126 130 128 Q128 134 122 138 Q116 144 108 144 L94 144 Q88 140 86 134 Z",
      // turban (wraps top)
      "M74 78 Q72 62 86 52 Q104 42 124 44 Q146 48 152 64 Q154 76 150 84 Q142 74 128 70 Q110 66 94 72 Q82 76 74 82 Z",
      // beard
      "M102 140 Q98 156 102 172 Q110 178 118 172 Q120 156 116 140 Z",
    ],
  },
  generic: {
    outline: [
      "M40 200 L40 168 Q52 154 70 150 L92 148 L114 148 L140 152 Q158 160 162 174 L162 200 Z",
      "M94 148 L94 128 Q104 124 112 128 L112 148 Z",
      "M84 130 Q74 118 74 98 Q74 76 88 62 Q102 50 120 52 Q138 56 146 74 Q150 90 146 108 L142 122 Q138 128 132 130 Q130 136 124 140 Q116 146 108 146 L94 146 Q88 142 86 136 Z",
    ],
  },
};

Object.assign(window, { MarbleBust });
