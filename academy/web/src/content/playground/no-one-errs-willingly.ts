// "No One Errs Willingly", a standalone essay page, kept exactly as written.
// Served by app/playground/no-one-errs-willingly/route.ts. String.raw keeps
// the page's own escapes (\u201C and the like) as source text.

const html = String.raw`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>No One Errs Willingly</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    color-scheme: light;
    --bg: #ECEAE3;
    --surface: #F6F5F0;
    --ink: #22252B;
    --ink-soft: #4F535B;
    --ink-faint: #8A8E95;
    --rule: #CFCCC2;
    --passion: #A23B2A;
    --passion-soft: #E9CFC8;
    --judgement: #2B4C6F;
    --judgement-soft: #CBD8E5;
    --ignorance: #8A6D1F;
    --ignorance-soft: #E8DCB6;
    --ignorance-deep: #5E4A12;
    box-sizing: border-box;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --bg: #15171C;
      --surface: #1E2127;
      --ink: #E8E4DA;
      --ink-soft: #B5B1A8;
      --ink-faint: #7E7B74;
      --rule: #34373F;
      --passion: #D9735F;
      --passion-soft: #4A2A24;
      --judgement: #7FA7CC;
      --judgement-soft: #233442;
      --ignorance: #D1AE4E;
      --ignorance-soft: #3F3618;
      --ignorance-deep: #EBD08C;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --bg: #15171C; --surface: #1E2127; --ink: #E8E4DA; --ink-soft: #B5B1A8;
    --ink-faint: #7E7B74; --rule: #34373F; --passion: #D9735F; --passion-soft: #4A2A24;
    --judgement: #7FA7CC; --judgement-soft: #233442; --ignorance: #D1AE4E;
    --ignorance-soft: #3F3618; --ignorance-deep: #EBD08C;
  }
  html { scroll-padding-top: env(safe-area-inset-top, 0px); }
  *, *::before, *::after { box-sizing: inherit; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: "EB Garamond", Garamond, "Times New Roman", serif;
    font-size: 1.1875rem;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 42rem; margin: 0 auto; padding: 2.5rem 1.25rem 5rem; }
  p { margin: 0 0 1.1em; max-width: 36em; }
  h1, h2, h3 { font-weight: 500; line-height: 1.15; margin: 0; }
  h2 { font-size: 1.75rem; margin: 3.5rem 0 1rem; }
  h3 { font-size: 1.25rem; margin: 2rem 0 .6rem; }
  em { font-style: italic; }
  .greek { font-feature-settings: "liga" 1; }

  /* Hero */
  .hero { padding-top: 1.5rem; }
  .hero .greek-title {
    font-size: clamp(1.4rem, 5vw, 2.1rem);
    color: var(--ink-soft);
    font-style: italic;
    font-weight: 400;
    display: block;
    margin-bottom: .4rem;
  }
  .hero h1 { font-size: clamp(2.6rem, 9vw, 4.25rem); letter-spacing: -.01em; }
  .hero .subtitle {
    margin-top: 1.25rem;
    font-size: 1.25rem;
    color: var(--ink-soft);
    max-width: 30em;
  }

  /* Ovid block */
  .ovid {
    margin: 3rem 0 0;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    padding: 1.75rem 0;
  }
  .ovid .latin {
    font-size: clamp(1.5rem, 5.5vw, 2.25rem);
    font-style: italic;
    line-height: 1.25;
    margin: 0 0 .5rem;
  }
  .ovid .latin span { white-space: nowrap; }
  .ovid .english { margin: 0; color: var(--ink-soft); }
  .ovid .english .seg-better { color: var(--judgement); }
  .ovid .english .seg-worse { color: var(--passion); }
  .ovid cite { display: block; font-style: normal; font-size: .95rem; color: var(--ink-faint); margin-top: .75rem; }

  /* Diagram frames */
  figure {
    margin: 1.5rem 0 2rem;
    background: var(--surface);
    border: 1px solid var(--rule);
    padding: 1.1rem 1rem .9rem;
  }
  figure svg { display: block; width: 100%; height: auto; }
  figure svg text {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: 15px;
    fill: var(--ink);
  }
  figure svg .lbl { font-size: 13px; fill: var(--ink-soft); }
  figure svg .big { font-size: 17px; font-weight: 600; }
  figure svg .italic { font-style: italic; font-family: "EB Garamond", serif; font-size: 16px; }
  figcaption {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .875rem;
    color: var(--ink-soft);
    margin-top: .75rem;
    line-height: 1.45;
  }
  figcaption b { font-weight: 600; color: var(--ink); }

  /* Two voices */
  .exchange { margin: 1.5rem 0 2rem; border-left: 3px solid var(--rule); padding-left: 1.1rem; }
  .exchange .voice { margin: 0 0 1.4rem; }
  .exchange .who {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .8rem; font-weight: 600; color: var(--ink-faint);
    display: block; margin-bottom: .2rem;
  }
  .exchange .voice.many { border-color: var(--passion); }
  .exchange .voice.socrates .who { color: var(--judgement); }
  .exchange q { font-style: italic; quotes: "“" "”"; }

  /* Comparison */
  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 1.25rem;
    margin: 1.5rem 0 2rem;
    font-size: 1.05rem;
  }
  .compare .col { border-top: 3px solid; padding-top: .75rem; }
  .compare .col.many { border-color: var(--passion); }
  .compare .col.soc { border-color: var(--judgement); }
  .compare h3 { margin: 0 0 .75rem; font-size: 1.2rem; }
  .compare dl { margin: 0; }
  .compare dt {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .8rem; color: var(--ink-faint); margin-top: 1rem; font-weight: 500;
  }
  .compare dd { margin: .15rem 0 0; line-height: 1.45; }
  @media (max-width: 520px) {
    .compare { grid-template-columns: 1fr; gap: 2rem 0; }
  }

  /* Takeaway */
  .takeaway {
    margin: 3rem 0 0;
    padding: 1.5rem 1.25rem;
    background: var(--ignorance-soft);
    color: var(--ink);
    border-left: 4px solid var(--ignorance);
    font-size: 1.2rem;
  }
  .takeaway p:last-child { margin: 0; }

  /* Sources */
  .sources { margin-top: 3.5rem; border-top: 1px solid var(--rule); padding-top: 1.25rem; font-size: .95rem; color: var(--ink-soft); }
  .sources ul { margin: .5rem 0 0; padding-left: 1.1rem; }
  .sources li { margin: .3rem 0; }

  /* Interactive blocks */
  .tool {
    margin: 1.5rem 0 2rem;
    border: 1px solid var(--rule);
    background: var(--surface);
    padding: 1.25rem 1.1rem 1.1rem;
  }
  .tool h3 { margin: 0 0 .35rem; }
  .tool .hint { color: var(--ink-soft); font-size: 1rem; margin-bottom: 1rem; }
  .tool label {
    display: block;
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .85rem; color: var(--ink-soft); margin: .9rem 0 .3rem;
  }
  .tool input[type=text] {
    width: 100%; font: inherit; font-size: 1.05rem; padding: .55rem .7rem;
    border: 1px solid var(--rule); background: var(--bg); color: var(--ink);
  }
  .tool input[type=text]:focus-visible { outline: 2px solid var(--judgement); outline-offset: 1px; }
  .btn {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .95rem; font-weight: 500; cursor: pointer;
    padding: .55rem 1rem; border: 1.5px solid var(--ink); background: var(--ink); color: var(--bg);
    margin: 1rem .5rem 0 0;
  }
  .btn.quiet { background: transparent; color: var(--ink); }
  .btn.passion { background: var(--passion); border-color: var(--passion); color: #fff; }
  .btn.judgement { background: var(--judgement); border-color: var(--judgement); color: #fff; }
  .btn:disabled { opacity: .45; cursor: default; }
  .result { margin-top: 1.5rem; border-top: 1px solid var(--rule); padding-top: 1rem; }
  .result[hidden] { display: none; }
  .result .voice { margin: 0 0 1.1rem; }
  .result .who {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .8rem; font-weight: 600; display: block; margin-bottom: .15rem; color: var(--ink-faint);
  }
  .result .voice.many .who { color: var(--passion); }
  .result .voice.soc .who { color: var(--judgement); }
  .result .voice.stoic .who { color: var(--ignorance); }
  .result .carry { font-style: italic; color: var(--ink-soft); }

  /* Assent gate */
  .gate .impression {
    font-size: 1.35rem; font-style: italic; line-height: 1.35;
    padding: 1rem 1.1rem; border-left: 3px solid var(--ink-faint); margin: .5rem 0 0;
    min-height: 4.2em;
  }
  .gate .counter {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .85rem; color: var(--ink-soft); margin-top: .5rem;
  }
  .gate .outcome { margin-top: 1.25rem; padding: 1rem 1.1rem; }
  .gate .outcome[hidden] { display: none; }
  .gate .outcome.assented { background: var(--passion-soft); border-left: 3px solid var(--passion); }
  .gate .outcome.withheld { background: var(--judgement-soft); border-left: 3px solid var(--judgement); }
  .gate .outcome p { margin: 0 0 .5em; }
  .gate .outcome p:last-child { margin: 0; }
  .gate .outcome .tag {
    font-family: "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: .8rem; font-weight: 600; display: block; margin-bottom: .3rem;
  }
  .gate .outcome.assented .tag { color: var(--passion); }
  .gate .outcome.withheld .tag { color: var(--judgement); }

  /* Quiz */
  .quiz .q { margin: 1.5rem 0 0; padding-top: 1.25rem; border-top: 1px solid var(--rule); }
  .quiz .q:first-of-type { border-top: 0; padding-top: 0; }
  .quiz .prompt { margin-bottom: .75rem; }
  .quiz .opts { display: grid; gap: .5rem; }
  .quiz .opt {
    text-align: left; font: inherit; font-size: 1.05rem; line-height: 1.4; cursor: pointer;
    padding: .65rem .85rem; border: 1px solid var(--rule); background: var(--bg); color: var(--ink);
  }
  .quiz .opt:hover { border-color: var(--ink-soft); }
  .quiz .opt.right { border-color: var(--judgement); background: var(--judgement-soft); }
  .quiz .opt.wrong { border-color: var(--passion); background: var(--passion-soft); }
  .quiz .opt:disabled { cursor: default; }
  .quiz .why { margin: .75rem 0 0; color: var(--ink-soft); font-size: 1.02rem; }
  .quiz .why[hidden] { display: none; }
  .quiz .score { margin-top: 1.5rem; font-size: 1.1rem; }
  .quiz .score[hidden] { display: none; }

  a { color: var(--judgement); }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--judgement); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
<main>

  <header class="hero">
    <span class="greek-title greek">οὐδεὶς ἑκὼν ἁμαρτάνει</span>
    <h1>No one errs willingly</h1>
    <p class="subtitle">Socrates’ claim that there is no such thing as acting against your better judgement. What looks like weakness of will is ignorance of your own ignorance.</p>
  </header>

  <section class="ovid" aria-label="Ovid's line">
    <p class="latin"><span>Video meliora proboque,</span> <span>deteriora sequor.</span></p>
    <p class="english"><span class="seg-better">I see what is better and approve of it,</span> <span class="seg-worse">but I pursue what is worse.</span></p>
    <cite>Ovid, Metamorphoses 7.20. The line everyone quotes to prove Socrates wrong.</cite>
  </section>

  <h2>The picture most people hold</h2>
  <p>You know the better course. A desire rises up, overpowers that knowledge, and you do the worse thing anyway. Afterwards you say what Segvic calls the insistent first-person claim: <em>whatever your theory, I knew full well that what I was going to do was bad; yet I did it.</em></p>
  <p>On this picture the problem is a defeat. Knowledge was present and lost a fight. Philosophers call it <em>akrasia</em>, and the ordinary name for it is weakness of will.</p>

  <figure>
    <svg viewBox="0 0 640 300" role="img" aria-labelledby="fig1t">
      <title id="fig1t">The common picture: knowledge of the better is overpowered by passion and the worse action follows</title>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-soft)"/>
        </marker>
        <marker id="ahp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--passion)"/>
        </marker>
      </defs>
      <!-- knowledge box -->
      <rect x="20" y="40" width="200" height="86" fill="var(--judgement-soft)" stroke="var(--judgement)" stroke-width="1.5"/>
      <text x="120" y="76" text-anchor="middle" class="big" fill="var(--judgement)">Knowledge</text>
      <text x="120" y="100" text-anchor="middle" class="lbl">of what is better</text>
      <!-- straight path, broken -->
      <path d="M220,83 L300,83" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="6 6"/>
      <text x="340" y="88" text-anchor="middle" class="lbl">×</text>
      <path d="M380,83 L430,83" stroke="var(--ink-soft)" stroke-width="2" stroke-dasharray="6 6"/>
      <text x="320" y="56" text-anchor="middle" class="lbl">the path knowledge should have taken</text>
      <!-- passion -->
      <circle cx="340" cy="190" r="52" fill="var(--passion-soft)" stroke="var(--passion)" stroke-width="1.5"/>
      <text x="340" y="186" text-anchor="middle" class="big" fill="var(--passion)">Passion</text>
      <text x="340" y="206" text-anchor="middle" class="lbl">pleasure, fear, anger</text>
      <!-- passion overpowers: arrow from passion up to the break -->
      <path d="M340,138 L340,100" stroke="var(--passion)" stroke-width="2.5" marker-end="url(#ahp)"/>
      <text x="358" y="122" class="lbl" fill="var(--passion)">overpowers</text>
      <!-- passion to action -->
      <path d="M392,190 C450,190 470,150 490,120" stroke="var(--passion)" stroke-width="2.5" fill="none" marker-end="url(#ahp)"/>
      <!-- action -->
      <rect x="440" y="40" width="180" height="86" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="1.5"/>
      <text x="530" y="76" text-anchor="middle" class="big">The worse act</text>
      <text x="530" y="100" text-anchor="middle" class="lbl">done anyway</text>
      <text x="20" y="276" class="italic" fill="var(--ink-soft)">“I knew it was bad, yet I did it.”</text>
    </svg>
    <figcaption><b>Weakness of will.</b> Knowledge is real and intact; it simply loses to something stronger. Socrates thinks this picture is incoherent.</figcaption>
  </figure>

  <h2>Socrates’ first move: belief is implied in action</h2>
  <p>Socrates will not accept that an agent can go for something without taking it, in some way, to be good. Nobody wants bad things as bad. Every desire already contains a judgement: <em>this, here and now, is worth having.</em> When you act on a desire you act on that judgement, and that judgement is what moves you.</p>
  <p>So the action is not evidence that knowledge lost. It is evidence of what you actually believed at the moment of acting. The claim <em>I knew it was bad</em> describes something sitting off to the side, a general opinion about the type of act. It was not the belief doing the work.</p>

  <figure>
    <svg viewBox="0 0 640 320" role="img" aria-labelledby="fig2t">
      <title id="fig2t">Socrates' picture: the desire contains a value judgement that this is good here and now, and that judgement produces the action; the professed belief that it is bad sits disconnected</title>
      <!-- desire container -->
      <rect x="20" y="40" width="330" height="150" fill="var(--passion-soft)" stroke="var(--passion)" stroke-width="1.5"/>
      <text x="36" y="66" class="big" fill="var(--passion)">Desire</text>
      <text x="36" y="86" class="lbl">what the many call being overcome</text>
      <!-- judgement nested inside desire -->
      <rect x="36" y="100" width="298" height="74" fill="var(--judgement-soft)" stroke="var(--judgement)" stroke-width="1.5"/>
      <text x="185" y="128" text-anchor="middle" class="big" fill="var(--judgement)">Value judgement</text>
      <text x="185" y="152" text-anchor="middle" class="italic">“this is good, here and now”</text>
      <!-- arrow to action -->
      <path d="M350,115 L440,115" stroke="var(--ink-soft)" stroke-width="2.5" marker-end="url(#ah)"/>
      <text x="395" y="104" text-anchor="middle" class="lbl">moves</text>
      <!-- action -->
      <rect x="450" y="72" width="170" height="86" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="1.5"/>
      <text x="535" y="108" text-anchor="middle" class="big">The act</text>
      <text x="535" y="132" text-anchor="middle" class="lbl">reveals the belief</text>
      <!-- disconnected belief -->
      <rect x="20" y="236" width="330" height="60" fill="none" stroke="var(--ink-faint)" stroke-width="1.5" stroke-dasharray="6 5"/>
      <text x="185" y="261" text-anchor="middle" class="lbl">Professed belief</text>
      <text x="185" y="282" text-anchor="middle" class="italic" fill="var(--ink-soft)">“acts like this are bad”</text>
      <text x="400" y="272" class="lbl" fill="var(--ink-faint)">no line to the act</text>
      <line x1="350" y1="266" x2="392" y2="266" stroke="var(--ink-faint)" stroke-width="1" stroke-dasharray="2 4"/>
    </svg>
    <figcaption><b>The passion is not an outside force.</b> It is a judgement about what is good. The action is the receipt for which judgement you actually held.</figcaption>
  </figure>

  <h2>The diagnosis: two layers of ignorance</h2>
  <p>Every wrongdoer, for Socrates, is ignorant of what is good or bad. That is the first layer, and it is shared by anyone who errs. The person described as akratic has a second layer on top of it: he lacks knowledge of what is better and, at the same time, is convinced he possesses it. He mistakes a belief for knowledge.</p>
  <p>This is why Socrates, in the <em>Protagoras</em>, calls being overpowered by pleasure <span class="greek">ἀμαθία ἡ μεγίστη</span>, the greatest ignorance. Not because the pleasure was so strong, but because the ignorance is hidden from the one who has it. It is the exact condition Socrates spent his life exposing in Athens.</p>

  <figure>
    <svg viewBox="0 0 640 330" role="img" aria-labelledby="fig3t">
      <title id="fig3t">Two nested layers: ignorance of what is good, and within it ignorance of that ignorance, which is the greatest ignorance</title>
      <!-- outer ring -->
      <rect x="20" y="24" width="600" height="282" fill="var(--ignorance-soft)" stroke="var(--ignorance)" stroke-width="1.5"/>
      <text x="40" y="54" class="big" fill="var(--ignorance-deep)">First layer: ignorance of what is good</text>
      <text x="40" y="76" class="lbl">every wrongdoer has this. A false picture of what will make life go well.</text>
      <!-- inner -->
      <rect x="40" y="100" width="560" height="186" fill="var(--surface)" stroke="var(--ignorance)" stroke-width="2"/>
      <text x="60" y="132" class="big" fill="var(--ignorance-deep)">Second layer: ignorance of that ignorance</text>
      <text x="60" y="156" class="lbl">the “akratic” thinks he has the knowledge he lacks.</text>
      <text x="60" y="176" class="lbl">His belief passes itself off as knowledge, so he never examines it.</text>
      <!-- the quote -->
      <text x="60" y="218" class="italic">“I saw clearly that this was bad, yet I did it.”</text>
      <text x="60" y="244" class="lbl" fill="var(--ignorance-deep)">The word “saw” is the error. He believed; he did not know.</text>
      <text x="60" y="270" class="greek" font-size="15" fill="var(--ignorance-deep)">ἀμαθία ἡ μεγίστη, the greatest ignorance (Prot. 357e)</text>
    </svg>
    <figcaption><b>Not weakness, but a disguised gap.</b> Strength of will cannot fix it, because the agent does not believe there is anything to fix.</figcaption>
  </figure>

  <h2>Why this is so hard to accept</h2>
  <p>Segvic puts her finger on it. Nobody doubts akrasia because of third-person evidence. We doubt the denial because of our own memory of going against a firm conviction. The exchange runs like this.</p>

  <div class="exchange">
    <div class="voice many">
      <span class="who">The many</span>
      <q>But whatever your theory, I knew full well that what I was going to do was bad. I did it anyway. You cannot explain that away.</q>
    </div>
    <div class="voice socrates">
      <span class="who">Socrates</span>
      <q>You say you believed your act was wrong. Your act says you believed it was good, here and now. One of these is what you actually believed, and only one of them moved you. Call the other what it is: an opinion you held about the type, which you mistook for knowledge of the case. You were not overpowered. You were mistaken, and mistaken about being mistaken.</q>
    </div>
  </div>

  <p>Notice what Socrates does not deny. He grants that reflection generates values, and that impulses can run against them. What he denies is that the reflective judgement was <em>knowledge</em>. Knowledge, on his view, cannot be dragged around like a slave. If it could be, it was never knowledge.</p>

  <h2>Try it on your own case</h2>
  <p>The argument is easiest to test on something small and recent. Describe one act you would normally file under weakness of will, and the page will restate it the way Socrates and the Stoics would.</p>

  <div class="tool" id="translator">
    <h3>Translate the excuse</h3>
    <p class="hint">Nothing you type leaves this page.</p>
    <label for="act">What you did</label>
    <input type="text" id="act" placeholder="ate the whole pint after dinner" autocomplete="off">
    <label for="claim">What you tell yourself about it</label>
    <input type="text" id="claim" placeholder="I knew it was a bad idea" autocomplete="off">
    <button class="btn" id="translate">Restate it</button>
    <button class="btn quiet" id="example">Use an example</button>
    <div class="result" id="translation" hidden>
      <div class="voice many"><span class="who">How you tell it</span><p id="out-many"></p></div>
      <div class="voice soc"><span class="who">How Socrates hears it</span><p id="out-soc"></p></div>
      <div class="voice stoic"><span class="who">Where the Stoics locate it</span><p id="out-stoic"></p></div>
      <p class="carry" id="out-carry"></p>
    </div>
  </div>

  <h2>The two pictures side by side</h2>
  <div class="compare">
    <div class="col many">
      <h3>Weakness of will</h3>
      <dl>
        <dt>What was present</dt><dd>Knowledge of the better</dd>
        <dt>What went wrong</dt><dd>Passion overpowered it</dd>
        <dt>What the act shows</dt><dd>A defeat</dd>
        <dt>The remedy</dt><dd>More willpower, more restraint</dd>
        <dt>Blame lands on</dt><dd>A weak character</dd>
      </dl>
    </div>
    <div class="col soc">
      <h3>Socrates’ diagnosis</h3>
      <dl>
        <dt>What was present</dt><dd>A belief mistaken for knowledge</dd>
        <dt>What went wrong</dt><dd>A false judgement about what is good now</dd>
        <dt>What the act shows</dt><dd>What you really believed</dd>
        <dt>The remedy</dt><dd>Examination, until the gap is seen</dd>
        <dt>Blame lands on</dt><dd>Unexamined ignorance</dd>
      </dl>
    </div>
  </div>

  <h2>What the Stoics did with it</h2>
  <p>The Stoics took Socrates’ denial and built a psychology on it. For Chrysippus the mind has no separate irrational part that reason can lose to. There is one commanding faculty, and a passion is something that faculty does. An impression arrives: <em>this is good, and I should go for it now.</em> If you assent, an impulse follows and you act. A passion is an assent to a false impression of that kind, one that overshoots the measure reason would set. Chrysippus called it an excessive impulse and compared it to a runner whose legs carry him past the point where he meant to stop. The running is still his.</p>
  <p>This is the Stoic answer to Medea, who says in Euripides that she knows the evil she is about to do but anger is master of her plans. Chrysippus read the line the way Socrates reads Ovid. Anger is not a second agent inside her. It is Medea judging, here and now, that revenge is worth more than her children. Her reason has not been overpowered. It has gone wrong.</p>

  <figure>
    <svg viewBox="0 0 640 300" role="img" aria-labelledby="fig4t">
      <title id="fig4t">The Stoic sequence: impression, assent, impulse, act, with passion located at the moment of assent</title>
      <!-- four stages -->
      <rect x="20" y="60" width="130" height="80" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="1.5"/>
      <text x="85" y="94" text-anchor="middle" class="big">Impression</text>
      <text x="85" y="116" text-anchor="middle" class="italic">“this is good”</text>
      <path d="M150,100 L178,100" stroke="var(--ink-soft)" stroke-width="2.5" marker-end="url(#ah)"/>

      <rect x="180" y="60" width="130" height="80" fill="var(--judgement-soft)" stroke="var(--judgement)" stroke-width="2"/>
      <text x="245" y="94" text-anchor="middle" class="big" fill="var(--judgement)">Assent</text>
      <text x="245" y="116" text-anchor="middle" class="lbl">the judgement</text>
      <path d="M310,100 L338,100" stroke="var(--ink-soft)" stroke-width="2.5" marker-end="url(#ah)"/>

      <rect x="340" y="60" width="130" height="80" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="1.5"/>
      <text x="405" y="94" text-anchor="middle" class="big">Impulse</text>
      <text x="405" y="116" text-anchor="middle" class="lbl">the movement</text>
      <path d="M470,100 L498,100" stroke="var(--ink-soft)" stroke-width="2.5" marker-end="url(#ah)"/>

      <rect x="500" y="60" width="120" height="80" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="1.5"/>
      <text x="560" y="94" text-anchor="middle" class="big">Act</text>
      <text x="560" y="116" text-anchor="middle" class="lbl">the receipt</text>

      <!-- passion bracket under assent -->
      <path d="M180,160 L180,172 L310,172 L310,160" stroke="var(--passion)" stroke-width="2" fill="none"/>
      <path d="M245,172 L245,190" stroke="var(--passion)" stroke-width="2"/>
      <rect x="120" y="192" width="250" height="66" fill="var(--passion-soft)" stroke="var(--passion)" stroke-width="1.5"/>
      <text x="245" y="218" text-anchor="middle" class="big" fill="var(--passion)">Passion lives here</text>
      <text x="245" y="240" text-anchor="middle" class="lbl">assent to a false impression, in excess</text>

      <text x="400" y="218" class="lbl" fill="var(--ink-soft)">Not here. The impulse only</text>
      <text x="400" y="238" class="lbl" fill="var(--ink-soft)">carries out what reason assented to.</text>

      <text x="20" y="286" class="italic" fill="var(--ink-soft)">Chrysippus: a passion is an impulse that overshoots, reason itself gone wrong.</text>
    </svg>
    <figcaption><b>One faculty, not two.</b> Since the passion is a judgement, the only place to intervene is before assent. This is why Epictetus keeps saying: it is not things that disturb us but our judgements about things.</figcaption>
  </figure>

  <h2>The assent gate</h2>
  <p>An impression is not up to you. Whether you believe it is. Below, a series of impressions arrive the way they do in a day, already carrying a judgement inside them. Assent and see what follows. Withhold and see what the Stoic does with the same moment.</p>

  <div class="tool gate" id="gate">
    <h3>An impression arrives</h3>
    <p class="impression" id="impression"></p>
    <button class="btn passion" id="assent">Assent</button>
    <button class="btn judgement" id="withhold">Withhold</button>
    <button class="btn quiet" id="next" hidden>Next impression</button>
    <div class="outcome" id="outcome" hidden>
      <span class="tag" id="outcome-tag"></span>
      <p id="outcome-text"></p>
      <p id="outcome-note"></p>
    </div>
    <p class="counter" id="counter"></p>
  </div>

  <p>Epictetus draws the practical conclusion in the same breath as Socrates. The man who insults you or steals from you is deceived about good and evil. He acts on what seemed right to him, and it seemed right because he does not know better. So the fitting response is not hatred but the one you would give a blind man, with a thought added: <em>it seemed so to him.</em> Marcus Aurelius turns this into his morning practice, reminding himself that the meddling and ungrateful people he will meet are that way because they cannot tell good from evil, and that he has seen the nature of the good and they have not yet.</p>
  <p>The Stoics add something Socrates left implicit. Because the error lives in assent, it can be caught. The gap between the impression and the judgement is small, but it is yours, and the whole of Stoic training is the practice of widening it until a false impression can arrive without being believed.</p>

  <div class="takeaway">
    <p>No one errs willingly because no one chooses the worse while knowing it is worse. The people who feel they do are the ones who most need to find out what they do not know. That is the whole Socratic project, and it is why the Stoics could later say that a passion is not a force against reason but a judgement reason got wrong. The remedy for both is the same: examine the judgement before you act on it.</p>
  </div>

  <h2>Check the distinction</h2>
  <p>Five questions. Each one turns on the difference between knowledge defeated and knowledge never possessed.</p>

  <div class="tool quiz" id="quiz"></div>

  <section class="sources" aria-label="Sources">
    <strong>Sources</strong>
    <ul>
      <li>Plato, <em>Protagoras</em> 352d (the many’s claim), 357e (the greatest ignorance), 358c–d (no one goes willingly toward what he thinks bad)</li>
      <li>Plato, <em>Meno</em> 77b–78b (no one desires bad things as bad)</li>
      <li>Plato, <em>Apology</em> (ignorance of one’s own ignorance as the affliction Socrates set out to expose)</li>
      <li>Ovid, <em>Metamorphoses</em> 7.20</li>
      <li>Chrysippus on passion as excessive impulse and the runner, in Galen, <em>On the Doctrines of Hippocrates and Plato</em> 4.2–4.6, and Stobaeus 2.88–90</li>
      <li>Euripides, <em>Medea</em> 1078–1080, as read by Chrysippus</li>
      <li>Epictetus, <em>Discourses</em> 1.18 and 1.28; <em>Enchiridion</em> 5 and 42</li>
      <li>Marcus Aurelius, <em>Meditations</em> 2.1, 7.22, 7.63 (citing Plato: every soul is deprived of truth against its will)</li>
      <li>Heda Segvic, “No One Errs Willingly: The Meaning of Socratic Intellectualism,” pp. 29–32</li>
    </ul>
  </section>

</main>
<script>
(function () {
  // ---------- Translator ----------
  var actEl = document.getElementById('act');
  var claimEl = document.getElementById('claim');
  var out = document.getElementById('translation');

  function clean(s, fallback) {
    s = (s || '').trim().replace(/[.!?]+$/, '');
    return s || fallback;
  }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  function translate() {
    var act = clean(actEl.value, 'ate the whole pint after dinner');
    var claim = clean(claimEl.value, 'I knew it was a bad idea');
    var a = lowerFirst(act);
    document.getElementById('out-many').textContent =
      '\u201C' + claim + ', yet I ' + a + '. Something got the better of me.\u201D';
    document.getElementById('out-soc').textContent =
      'Your act says what you believed. At that moment you judged that it was worth it to have ' + a +
      '. The thought \u201C' + lowerFirst(claim) + '\u201D was an opinion about acts of that kind in general. It was not knowledge of this case, or it would have moved you. You did not lose a fight. You were mistaken about what was good, and mistaken about being mistaken.';
    document.getElementById('out-stoic').textContent =
      'The impression was \u201Cit is good, right now, to have ' + a +
      '.\u201D You assented, and the impulse carried out the assent. The passion was not a force arriving from outside; it was the assent itself, overshooting. The act was only the receipt.';
    document.getElementById('out-carry').textContent =
      'Question to carry: what exactly did I believe was good about it, and is that belief true?';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  document.getElementById('translate').addEventListener('click', translate);
  document.getElementById('example').addEventListener('click', function () {
    actEl.value = 'snapped at my daughter over spilled milk';
    claimEl.value = 'I knew it was not a big deal';
    translate();
  });
  [actEl, claimEl].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') translate(); });
  });

  // ---------- Assent gate ----------
  var impressions = [
    { text: 'He cut you off on purpose. Let him know what you think of that.',
      assent: 'You lean on the horn and close the gap. Your pulse is up for the next ten minutes and the drive home is ruined by a stranger who has already forgotten you.',
      withhold: 'It seemed so to him. Perhaps he did not see you; perhaps he is late to something that matters. You were not harmed. You keep your distance and your morning.' },
    { text: 'One more episode. You have earned it after a day like this.',
      assent: 'It is one in the morning. The episode did not restore anything. The morning pays the bill, and the belief that rest comes from the screen is a little more entrenched.',
      withhold: 'The impression says rest is in the next episode. Rest is in bed. You go to bed, which is what you were actually asking for.' },
    { text: 'She has not written back. She is losing interest in you.',
      assent: 'You draft a cool reply to protect yourself. The distance you feared becomes a distance you made. The story explained the silence, and the story was yours.',
      withhold: 'A silence is a silence. The meaning was added by you. You wait, and when the reply comes, it comes to someone who did not punish her for being busy.' },
    { text: 'They praised the work. You are better than the people around you.',
      assent: 'The pleasure is real and it wants more. Next time the praise is smaller you feel it as an injury. You have handed your sense of the work to whoever is in the room.',
      withhold: 'The work was good. That is a fact about the work. Who is better than whom is a judgement you did not need, and it was never up to you anyway.' },
    { text: 'Your father is getting worse. This is unbearable.',
      assent: 'Grief is proper to the moment. \u201CUnbearable\u201D is the addition, and it makes the days with him harder to be present for, because each one arrives already judged.',
      withhold: 'You let the sorrow be what it is without the verdict on top of it. What is left is hard, and bearable, and you are there for it.' }
  ];
  var idx = 0, assents = 0, withholds = 0;
  var impEl = document.getElementById('impression');
  var outcome = document.getElementById('outcome');
  var btnA = document.getElementById('assent');
  var btnW = document.getElementById('withhold');
  var btnN = document.getElementById('next');
  var counter = document.getElementById('counter');

  function showImpression() {
    impEl.textContent = '\u201C' + impressions[idx].text + '\u201D';
    outcome.hidden = true;
    btnA.disabled = false; btnW.disabled = false;
    btnA.hidden = false; btnW.hidden = false; btnN.hidden = true;
    counter.textContent = 'Impression ' + (idx + 1) + ' of ' + impressions.length;
  }
  function decide(assented) {
    var item = impressions[idx];
    if (assented) assents++; else withholds++;
    outcome.className = 'outcome ' + (assented ? 'assented' : 'withheld');
    document.getElementById('outcome-tag').textContent = assented ? 'You assented. A passion follows.' : 'You withheld. The gap widens.';
    document.getElementById('outcome-text').textContent = assented ? item.assent : item.withhold;
    document.getElementById('outcome-note').textContent = assented
      ? 'Notice that nothing overpowered you. You believed the impression, and the rest followed from the belief.'
      : 'The impression still arrived. What changed is that it was not mistaken for knowledge.';
    outcome.hidden = false;
    btnA.disabled = true; btnW.disabled = true;
    btnN.hidden = false;
    if (idx === impressions.length - 1) {
      btnN.textContent = 'Start again';
      counter.textContent = 'Assented ' + assents + ', withheld ' + withholds + '. Every withheld assent is the Stoic exercise in miniature.';
    }
  }
  btnA.addEventListener('click', function () { decide(true); });
  btnW.addEventListener('click', function () { decide(false); });
  btnN.addEventListener('click', function () {
    if (idx === impressions.length - 1) { idx = 0; assents = 0; withholds = 0; btnN.textContent = 'Next impression'; }
    else idx++;
    showImpression();
  });
  showImpression();

  // ---------- Quiz ----------
  var questions = [
    { q: 'You say: \u201CI knew eating it was bad, but I did it anyway.\u201D On Socrates\u2019 view, what did you actually know?',
      opts: ['That eating it was bad. The knowledge was real and was overpowered.',
             'Only that acts like this are bad in general. In the moment you judged this one good.',
             'Nothing at all. Socrates thinks the many know nothing.'],
      right: 1,
      why: 'The general opinion was real, but it was an opinion about the type. The belief that moved you was the one about the case, and it said \u201Cgood, now.\u201D' },
    { q: 'Chrysippus compares a passion to a runner who cannot stop at the line. What does the runner\u2019s momentum stand for?',
      opts: ['An irrational part of the soul dragging reason along.',
             'The body resisting the soul.',
             'Reason\u2019s own impulse exceeding the measure reason would set.'],
      right: 2,
      why: 'There is one faculty. The running is the runner\u2019s. The passion is reason itself gone past its mark, not a second agent.' },
    { q: 'Why does Socrates call being overcome by pleasure the greatest ignorance?',
      opts: ['Because pleasure is the strongest force acting on us.',
             'Because the ignorance is hidden from the person who has it.',
             'Because it leads to the worst acts.'],
      right: 1,
      why: 'Ordinary ignorance can be corrected. Ignorance that believes itself knowledge never gets examined. That is the second layer.' },
    { q: 'Epictetus says of the man who wrongs you: \u201Cit seemed so to him.\u201D What is the point?',
      opts: ['He is deceived about good and evil, so pity fits better than hatred.',
             'Everyone\u2019s view is as good as everyone else\u2019s.',
             'He should be excused and nothing more said.'],
      right: 0,
      why: 'The claim is diagnostic, not permissive. He acted on a false picture of the good. You would not hate a blind man for stumbling; you might try to help him see.' },
    { q: 'Where do the Stoics say you can actually intervene?',
      opts: ['After the act, by making amends.',
             'At the impulse, by holding yourself back.',
             'At assent, before the impression is believed.'],
      right: 2,
      why: 'Impression, assent, impulse, act. Once assent is given the impulse follows from it. The only free moment is the judgement.' }
  ];
  var quiz = document.getElementById('quiz');
  var answered = 0, correct = 0;
  questions.forEach(function (item, qi) {
    var wrap = document.createElement('div'); wrap.className = 'q';
    var p = document.createElement('p'); p.className = 'prompt'; p.textContent = (qi + 1) + '. ' + item.q;
    var opts = document.createElement('div'); opts.className = 'opts';
    var why = document.createElement('p'); why.className = 'why'; why.hidden = true;
    item.opts.forEach(function (o, oi) {
      var b = document.createElement('button'); b.className = 'opt'; b.type = 'button'; b.textContent = o;
      b.addEventListener('click', function () {
        var all = opts.querySelectorAll('.opt');
        all.forEach(function (x) { x.disabled = true; });
        all[item.right].classList.add('right');
        if (oi === item.right) correct++; else b.classList.add('wrong');
        why.textContent = item.why; why.hidden = false;
        answered++;
        if (answered === questions.length) {
          var s = document.getElementById('score');
          s.textContent = correct + ' of ' + questions.length + '. ' + (correct === questions.length
            ? 'You have the distinction. The harder part is noticing it in the moment.'
            : 'Reread the two nested layers above; every question turns on them.');
          s.hidden = false;
        }
      });
      opts.appendChild(b);
    });
    wrap.appendChild(p); wrap.appendChild(opts); wrap.appendChild(why);
    quiz.appendChild(wrap);
  });
  var score = document.createElement('p'); score.className = 'score'; score.id = 'score'; score.hidden = true;
  quiz.appendChild(score);
})();
</script>
</body>
</html>
`

export default html
