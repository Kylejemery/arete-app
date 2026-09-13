# UI kit: Arete Academy and web

Open `index.html`. The top nav switches between four surfaces.

| Surface | File | Scope | Source |
|---|---|---|---|
| Academy home | `AcademyHome.jsx` | `.academy` | `previews/web/academy-web.html` (left panel) |
| Course page + syllabus | `CoursePage.jsx` | `.academy` | same idiom, extended to a full page |
| The Agora: index, reader, topic page, submit | `AgoraIndex.jsx`, `AgoraEssay.jsx`, `AgoraTopic.jsx`, `AgoraSubmit.jsx` | `.academy` | new surface, no source preview |
| Web app v2 | `WebApp.jsx` | `.web` | `previews/web/academy-web.html` (right panel) |
| Library reader | `LibraryReader.jsx` | `.library` | `tokens.json` library text set + `DESIGN.md` ("Cormorant Garamond for the Library", marginalia) |

## What works

- Enroll / Syllabus open the course page; syllabus units expand.
- Web app: type a message, get a reply in a glass bubble.
- Library: the underlined passage in the text opens its marginal note.
- Agora: open an essay from the index, follow a topic from the sidebar, post a comment once unlocked, or fill in and submit the essay form.

## Caveat

The source ships **one** preview for these two surfaces, showing a hero panel and a chat panel. The Academy home, course page and Library reader are faithful extensions of that idiom (navy, Playfair, 2px card radius, 0px tracked-uppercase buttons, short gold rule) rather than recreations of screens that were provided. The web app panel is a direct recreation. Do not treat the Library reader layout as canonical.
