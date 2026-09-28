-- Tier 3 of the Long 2002 ch. 2 batch: a citation record, with no text, for
-- every work in the chapter's further reading, so the Coverage Gap Agent
-- knows each exists and can say when a question needs one.
--
-- Author and year come from the spec's list. Titles are filled only for the
-- three Tier 2 works, whose titles the spec itself gives; every other title,
-- the container, Long's page references and the one-line reason are left
-- blank for Kyle to supply from the book, per the spec ("leave a field blank
-- rather than guess"). staging_slug is linked when the Tier 2 sources are
-- staged.

insert into public.corpus_bibliography (author, year, title, cited_by, notes) values
  ('Brunt',            '1977',      null, 'Long 2002, ch. 2 further reading', null),
  ('Stadter',          '1980',      null, 'Long 2002, ch. 2 further reading', null),
  ('Wirth',            '1967',      null, 'Long 2002, ch. 2 further reading', null),
  ('Long, A. A.',      '1982a',     null, 'Long 2002, ch. 2 further reading', null),
  ('Hadot, I.',        '1996',      null, 'Long 2002, ch. 2 further reading', null),
  ('Dobbin',           '1998',      null, 'Long 2002, ch. 2 further reading', null),
  ('Hadot, P.',        '1992',      null, 'Long 2002, ch. 2 further reading', null),
  ('Hadot, P.',        '2000',      null, 'Long 2002, ch. 2 further reading', null),
  ('Boge',             '1973',      null, 'Long 2002, ch. 2 further reading', null),
  ('Boter',            '1999',      null, 'Long 2002, ch. 2 further reading', null),
  ('Souilhé',          '1948–1965', null, 'Long 2002, ch. 2 further reading', null),
  ('Clarke',           '1971',      null, 'Long 2002, ch. 2 further reading', null),
  ('Hock',             '1991',      null, 'Long 2002, ch. 2 further reading', null),
  ('Jocelyn',          '1982',      null, 'Long 2002, ch. 2 further reading', null),
  ('Douglas',          '1995',      null, 'Long 2002, ch. 2 further reading', null),
  ('Fuentes González', '1998',      null, 'Long 2002, ch. 2 further reading', null),
  ('De Lacy',          '1943',      null, 'Long 2002, ch. 2 further reading', null),
  ('Döring',           '1979',      null, 'Long 2002, ch. 2 further reading', null),
  ('Slings',           '1999',      null, 'Long 2002, ch. 2 further reading', null),
  ('Bowersock',        '1969',      null, 'Long 2002, ch. 2 further reading', null),
  ('Jones',            '1978',      null, 'Long 2002, ch. 2 further reading', null),
  ('Gleason',          '1995',      null, 'Long 2002, ch. 2 further reading', null),
  ('Sedley',           '1989',      null, 'Long 2002, ch. 2 further reading', null),
  ('Billerbeck',       '1978',      null, 'Long 2002, ch. 2 further reading', null),
  ('Billerbeck',       '1979',      null, 'Long 2002, ch. 2 further reading', null),
  ('Billerbeck',       '1996',      null, 'Long 2002, ch. 2 further reading', null),
  ('Griffin',          '1996',      null, 'Long 2002, ch. 2 further reading', null),
  ('Long, A. A.',      '1996b',     null, 'Long 2002, ch. 2 further reading', null),
  ('Halbauer, A.',     '1911',      'De diatribis Epicteti', 'Long 2002, ch. 2 further reading', 'Also Tier 2 (Latin; staged for OCR review if a scan is confirmed).'),
  ('Bonhöffer, A.',    '1890',      'Epictet und die Stoa', 'Long 2002, ch. 2 further reading', 'Also Tier 2 (German; staged for OCR review).'),
  ('Schenkl, H.',      '1916',      'Epicteti Dissertationes ab Arriano digestae', 'Long 2002, ch. 2 further reading', 'Also Tier 2 (Teubner; Greek text staged separately from the Latin introduction and apparatus).');
