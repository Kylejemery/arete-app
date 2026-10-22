-- research_source_sections: a locator index over a research_sources full
-- text, so a course reading or a citation can point at a real section and
-- printed page. Seminar Track spec, Part 2.
--
-- The first index is Robert Greene, The 48 Laws of Power (Kyle's own copy,
-- stored by scripts/research-sources/add.mjs from 13 scanned chapter PDFs;
-- index built by scripts/research-sources/greene-48-laws-index.mjs). One row
-- for the Preface and one per law, with the printed page range and the
-- character span in full_text. full_text carries a [p. N] marker at the top
-- of every printed page, so a span always starts on a page marker.
--
-- Offsets are 0-based: the section is
--   substr(full_text, char_start + 1, char_end - char_start).
-- parts holds the 0-based offset of each structural heading Greene uses
-- inside a law where the OCR found it (judgment, transgression, observance,
-- keys_to_power, image, authority, reversal). A missing key means the
-- heading was not found, not that the law lacks it.
--
-- Same rules as research_sources: RLS on, no policies, service role only.
-- Kyle's account reads a section through the server (admin check there),
-- never through the API. Rows are tied to the source by its sha256, not a
-- generated id. Deprecate, never delete: a rebuilt index deprecates the old
-- rows.

create table public.research_source_sections (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references public.research_sources(id),
  position    integer not null,
  key         text not null,
  label       text not null,
  title       text,
  page_start  text not null,
  page_end    text not null,
  char_start  integer not null check (char_start >= 0),
  char_end    integer not null,
  parts       jsonb not null default '{}'::jsonb,
  deprecated  boolean not null default false,
  created_at  timestamptz not null default now(),
  check (char_end > char_start)
);

create unique index research_source_sections_live_key
  on public.research_source_sections (source_id, key) where not deprecated;

alter table public.research_source_sections enable row level security;
revoke all on public.research_source_sections from anon, authenticated;

comment on table public.research_source_sections is
  'Locator index over research_sources full texts (section, printed pages, 0-based character span). Service role only, like research_sources.';

-- The text of one live section, for server side callers (the reading pane's
-- admin route, the Syllabus, Outline and Draft agents).
create function public.research_source_section_text(p_source uuid, p_key text)
returns text
language sql
stable
set search_path = public
as $$
  select substr(r.full_text, s.char_start + 1, s.char_end - s.char_start)
  from research_source_sections s
  join research_sources r on r.id = s.source_id
  where s.source_id = p_source and s.key = p_key
    and not s.deprecated and not r.deprecated and r.licence_status <> 'unconfirmed'
$$;

revoke all on function public.research_source_section_text(uuid, text) from public, anon, authenticated;

-- The 48 Laws of Power index.
insert into public.research_source_sections
  (source_id, position, key, label, title, page_start, page_end, char_start, char_end, parts)
select r.id, v.position, v.key, v.label, v.title, v.page_start, v.page_end, v.char_start, v.char_end, v.parts
from public.research_sources r
cross join (values
  (0,'preface','Preface','Preface','xvii','xxiii',0,22390,'{}'::jsonb),
  (1,'law-1','Law 1','Never Outshine the Master','1','7',22390,38531,'{"judgment":22438,"transgression":22770,"observance":27121,"keys_to_power":30862,"image":37129,"authority":37345,"reversal":37678}'::jsonb),
  (2,'law-2','Law 2','Never Put Too Much Trust in Friends, Learn How to Use Enemies','8','15',38531,62876,'{"judgment":38604,"transgression":38960,"observance":45708,"keys_to_power":52807,"image":60863,"authority":60945,"reversal":61416}'::jsonb),
  (3,'law-3','Law 3','Conceal Your Intentions','16','30',62876,105976,'{"judgment":62912,"transgression":63742,"observance":69986,"keys_to_power":74272,"image":102376,"authority":102562,"reversal":103058}'::jsonb),
  (4,'law-4','Law 4','Always Say Less Than Necessary','31','36',105976,122557,'{"judgment":106021,"transgression":107473,"observance":114032,"authority":121097,"reversal":121484}'::jsonb),
  (5,'law-5','Law 5','So Much Depends on Reputation: Guard It with Your Life','37','43',122557,143559,'{"judgment":122625,"observance":124169,"keys_to_power":134060,"image":142253,"authority":142557,"reversal":142996}'::jsonb),
  (6,'law-6','Law 6','Court Attention at All Cost','44','55',143559,176771,'{"judgment":143599,"observance":144322,"keys_to_power":153934,"image":173121,"authority":159192}'::jsonb),
  (7,'law-7','Law 7','Get Others to Do the Work for You, but Always Take the Credit','56','61',176771,192647,'{"judgment":176846,"transgression":177186,"observance":177204,"keys_to_power":185355,"image":190937,"authority":191214,"reversal":191500}'::jsonb),
  (8,'law-8','Law 8','Make Other People Come to You: Use Bait If Necessary','62','68',192647,208466,'{"judgment":192713,"keys_to_power":197844,"image":206495,"authority":206787,"reversal":207217}'::jsonb),
  (9,'law-9','Law 9','Win Through Your Actions, Never Through Argument','69','75',208466,229604,'{"judgment":208528,"observance":214087,"image":226616,"authority":226849,"reversal":226974}'::jsonb),
  (10,'law-10','Law 10','Infection: Avoid the Unhappy and Unlucky','76','81',229604,247890,'{"judgment":229664,"transgression":230000,"keys_to_power":241805,"image":244617,"authority":247185,"reversal":247598}'::jsonb),
  (11,'law-11','Law 11','Learn to Keep People Dependent on You','82','88',247890,267905,'{"transgression":248235,"keys_to_power":256846,"image":266111,"authority":266361,"reversal":266826}'::jsonb),
  (12,'law-12','Law 12','Use Selective Honesty and Generosity to Disarm Your Victim','89','94',267905,284594,'{"judgment":267975,"observance":269615,"authority":282018,"reversal":282328}'::jsonb),
  (13,'law-13','Law 13','When Asking for Help, Appeal to People''s Self-Interest, Never to Their Mercy or Gratitude','95','100',284594,300479,'{"judgment":284697,"transgression":285885,"observance":290546,"keys_to_power":294266,"image":298830,"authority":299106,"reversal":299277}'::jsonb),
  (14,'law-14','Law 14','Pose as a Friend, Work as a Spy','101','106',300479,314032,'{"judgment":300533,"observance":300916,"keys_to_power":304887,"authority":312041,"reversal":312528}'::jsonb),
  (15,'law-15','Law 15','Crush Your Enemy Totally','107','114',314032,335814,'{"judgment":314081,"observance":324342,"keys_to_power":328762,"image":333889,"authority":334125,"reversal":334441}'::jsonb),
  (16,'law-16','Law 16','Use Absence to Increase Respect and Honor','115','122',335814,356176,'{"judgment":335871,"transgression":337087,"observance":344281,"keys_to_power":349203,"authority":354670,"reversal":355228}'::jsonb),
  (17,'law-17','Law 17','Keep Others in Suspended Terror: Cultivate an Air of Unpredictability','123','129',356176,373062,'{"judgment":356260,"observance":356695,"keys_to_power":364310,"image":369949,"authority":370155,"reversal":370410}'::jsonb),
  (18,'law-18','Law 18','Do Not Build Fortresses to Protect Yourself: Isolation Is Dangerous','130','136',373062,394620,'{"transgression":373541,"observance":380073,"keys_to_power":384262,"image":392773,"authority":393049,"reversal":393372}'::jsonb),
  (19,'law-19','Law 19','Know Who You''re Dealing With: Do Not Offend the Wrong Person','137','144',394620,416677,'{"judgment":394697,"transgression":399614,"image":415901,"authority":416102,"reversal":416459}'::jsonb),
  (20,'law-20','Law 20','Do Not Commit to Anyone','145','155',416677,449680,'{"judgment":416728,"observance":417366,"keys_to_power":439851,"image":428265,"authority":428512,"reversal":448781}'::jsonb),
  (21,'law-21','Law 21','Play a Sucker to Catch a Sucker: Seem Dumber Than Your Mark','156','162',449680,467989,'{"observance":450023,"keys_to_power":460123,"authority":465065,"reversal":465524}'::jsonb),
  (22,'law-22','Law 22','Use the Surrender Tactic: Transform Weakness into Power','163','170',467989,488190,'{"judgment":468061,"transgression":469635,"observance":473504,"image":486451,"authority":486695,"reversal":487130}'::jsonb),
  (23,'law-23','Law 23','Concentrate Your Forces','171','177',488190,505803,'{"judgment":488230,"transgression":489826,"observance":492890,"keys_to_power":498814,"image":503024,"authority":503298,"reversal":503682}'::jsonb),
  (24,'law-24','Law 24','Play the Perfect Courtier','178','190',505803,542551,'{"judgment":505839}'::jsonb),
  (25,'law-25','Law 25','Re-Create Yourself','191','199',542551,565334,'{"observance":544093,"keys_to_power":555337,"authority":564522,"reversal":564906}'::jsonb),
  (26,'law-26','Law 26','Keep Your Hands Clean','200','214',565334,612382,'{"judgment":565372,"observance":565965,"keys_to_power":573747,"image":579817,"authority":580125,"reversal":609612}'::jsonb),
  (27,'law-27','Law 27','Play on People''s Need to Believe to Create a Cultlike Following','215','226',612382,654683,'{"judgment":612462,"observance":626445,"image":652600,"authority":653011,"reversal":653378}'::jsonb),
  (28,'law-28','Law 28','Enter Action with Boldness','227','235',654683,684087,'{"judgment":654722,"observance":659324,"keys_to_power":676241,"image":681935,"authority":682227}'::jsonb),
  (29,'law-29','Law 29','Plan All the Way to the End','236','244',684087,708559,'{"judgment":684127,"transgression":684523,"observance":693888,"keys_to_power":700907,"authority":706974,"reversal":707623}'::jsonb),
  (30,'law-30','Law 30','Make Your Accomplishments Seem Effortless','245','253',708559,734032,'{"judgment":708613,"observance":710307,"keys_to_power":726075,"image":731721,"authority":732021,"reversal":732436}'::jsonb),
  (31,'law-31','Law 31','Control the Options: Get Others to Play with the Cards You Deal','254','262',734032,759025,'{"judgment":734111,"observance":734516,"keys_to_power":749132,"image":757364,"authority":757645,"reversal":757890}'::jsonb),
  (32,'law-32','Law 32','Play to People''s Fantasies','263','270',759025,781217,'{"judgment":759064,"keys_to_power":770834,"image":778099,"authority":778323,"reversal":778813}'::jsonb),
  (33,'law-33','Law 33','Discover Each Man''s Thumbscrew','271','281',781217,819484,'{"judgment":781265,"observance":788240,"image":817791,"authority":818098,"reversal":818596}'::jsonb),
  (34,'law-34','Law 34','Be Royal in Your Own Fashion: Act Like a King to Be Treated Like One','282','290',819484,845563,'{"judgment":819565,"transgression":819898,"observance":826266,"keys_to_power":835906,"image":843349,"authority":843663,"reversal":844030}'::jsonb),
  (35,'law-35','Law 35','Master the Art of Timing','291','299',845563,874737,'{"judgment":845605,"keys_to_power":861156,"image":873894,"authority":874266,"reversal":874496}'::jsonb),
  (36,'law-36','Law 36','Disdain Things You Cannot Have: Ignoring Them Is the Best Revenge','300','308',874737,903257,'{"transgression":875226,"observance":883713,"keys_to_power":890889,"image":901397,"authority":901724,"reversal":902077}'::jsonb),
  (37,'law-37','Law 37','Create Compelling Spectacles','309','316',903257,927162,'{"judgment":903302,"observance":904858,"keys_to_power":917547,"image":926591,"authority":926787,"reversal":927050}'::jsonb),
  (38,'law-38','Law 38','Think As You Like but Behave Like Others','317','324',927162,952544,'{"judgment":927224,"transgression":928814,"observance":934209,"keys_to_power":943150,"image":950633,"authority":950440,"reversal":950978}'::jsonb),
  (39,'law-39','Law 39','Stir Up Waters to Catch Fish','325','332',952544,974856,'{"judgment":952590,"transgression":954201,"observance":960790,"keys_to_power":966077,"image":972131,"authority":972384,"reversal":972808}'::jsonb),
  (40,'law-40','Law 40','Despise the Free Lunch','333','346',974856,1026165,'{"judgment":974895,"transgression":981733,"observance":995746,"image":1022267,"authority":1023293,"reversal":1023884}'::jsonb),
  (41,'law-41','Law 41','Avoid Stepping into a Great Man''s Shoes','347','357',1026165,1062540,'{"judgment":1026222,"transgression":1027990,"keys_to_power":1046725,"image":1058727,"authority":1059077,"reversal":1059578}'::jsonb),
  (42,'law-42','Law 42','Strike the Shepherd and the Sheep Will Scatter','358','366',1062540,1087907,'{"judgment":1062603,"observance":1063069,"keys_to_power":1079533,"image":1086032,"authority":1086336,"reversal":1086783}'::jsonb),
  (43,'law-43','Law 43','Work on the Hearts and Minds of Others','367','375',1087907,1114419,'{"judgment":1087973,"transgression":1089626,"observance":1098738,"keys_to_power":1107069,"authority":1113958,"reversal":1114353}'::jsonb),
  (44,'law-44','Law 44','Disarm and Infuriate with the Mirror Effect','376','391',1114419,1165376,'{"judgment":1114476,"observance":1124927,"image":1162223,"authority":1161806}'::jsonb),
  (45,'law-45','Law 45','Preach the Need for Change, but Never Reform Too Much at Once','392','399',1165376,1189120,'{"judgment":1165469,"transgression":1165880,"observance":1173920,"keys_to_power":1180108,"image":1186733,"authority":1186280,"reversal":1187061}'::jsonb),
  (46,'law-46','Law 46','Never Appear Too Perfect','400','409',1189120,1226542,'{"judgment":1189157,"transgression":1189527,"observance":1198365,"keys_to_power":1207275,"image":1222756,"authority":1223090,"reversal":1223559}'::jsonb),
  (47,'law-47','Law 47','Do Not Go Past the Mark You Aimed For; In Victory, Learn When to Stop','410','418',1226542,1252115,'{"judgment":1226628,"transgression":1227008,"observance":1234348,"keys_to_power":1243742,"image":1250114,"authority":1250420,"reversal":1250947}'::jsonb),
  (48,'law-48','Law 48','Assume Formlessness','419','430',1252115,1291379,'{"judgment":1252147,"transgression":1253686,"observance":1262623,"keys_to_power":1272138,"image":1289798,"authority":1290218,"reversal":1290580}'::jsonb)

) as v(position, key, label, title, page_start, page_end, char_start, char_end, parts)
where r.sha256 = '3edeed88e005dd430c103bfd088e789a62947418d992266516d88e1ed314bb90'
  and not exists (
    select 1 from public.research_source_sections x
    where x.source_id = r.id and x.key = v.key and not x.deprecated
  );

-- The source files, by sha256, so the stored text can be traced to them.
update public.research_sources
set notes = notes || ' Source files (sha256): 48Laws 01.pdf e95c9e97883a7dca33986f70bf9921923e47dc4bb1ebf89dbad125781a46079b; 48Laws 02.pdf ef5cb292d6b2b5a86ae888b96e081a77369078e5a94fe7dcada803ea85a583da; 48Laws 03.pdf 3d5d3ea65421e8b95aaf021a316236032ecaa4ea3bb4a3a478203840768a0e57; 48Laws 04.pdf e5a2f959f2b0768e9772351d35273153e63385f987e0b7247e8cf62aa26a80c7; 48Laws 05.pdf fdc31c74104e62edfc2629aafae027fc0749a1e6ae3cf7f7faf37b9243521387; 48Laws 06.pdf e695974c49d0beb1414598e2d06e784082f1e22ebf9778dd9bf81c1644f0302d; 48Laws 07.pdf 5533c9202dac07adf87ecb19498d766f94059d4c20b5fb4e1de49e62e59f2b10; 48Laws 08.pdf 12763e3ffeaae2eaab3a7c94d0ddd82daafcce3223bee694bff017363ebfffbb; 48Laws 09.pdf f3e347e078b1383a4cc55fb4e3cde98002b57317e5dd66d525a92933ba990861; 48Laws 10.pdf 222a0e0c6b008b52cf45dec2f210d339b062d4a65cd9937519c34a57f4b6b0ba; 48Laws 11.pdf 8210f7bb65d403a6fc711b4345c64398f1f5d427c04ea0f055c74c08fbdf1ed5; 48Laws 12.pdf bc8ca8992fdfd966e216999dd2c64561e158d31671c454c0c389286d59a19aef; 48Laws 13.pdf 80c8fc5f102cd81f2e2c532fa16c2978fe96f18d6c02b00b45840a0b60729a98.'
where sha256 = '3edeed88e005dd430c103bfd088e789a62947418d992266516d88e1ed314bb90'
  and notes not like '%Source files (sha256)%';
