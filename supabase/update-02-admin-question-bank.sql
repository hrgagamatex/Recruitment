-- Recruitment Test Gamatex - Admin HR, Bank Soal, dan pengacakan

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  test_code text not null check(test_code in ('test1','test2')),
  question_number integer not null,
  prompt text not null,
  question_type text not null check(question_type in ('paired_choice','most_least')),
  options jsonb not null,
  indicator_codes jsonb not null default '[]'::jsonb,
  duration_seconds integer not null default 20 check(duration_seconds between 5 and 600),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(test_code,question_number)
);

create table if not exists public.test_settings (
  test_code text primary key check(test_code in ('test1','test2')),
  display_name text not null,
  randomize_questions boolean not null default true,
  randomize_options boolean not null default false,
  allow_back boolean not null default false,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.test_settings(test_code,display_name) values
('test1','Tes 1 - Pilihan Pernyataan'),('test2','Tes 2 - Paling/Kurang')
on conflict(test_code) do nothing;

alter table public.test_attempts add column if not exists question_snapshot jsonb;
alter table public.question_bank enable row level security;
alter table public.test_settings enable row level security;

drop policy if exists "admin manage questions" on public.question_bank;
create policy "admin manage questions" on public.question_bank for all to authenticated
using(public.is_active_admin()) with check(public.is_active_admin());
drop policy if exists "admin manage settings" on public.test_settings;
create policy "admin manage settings" on public.test_settings for all to authenticated
using(public.is_active_admin()) with check(public.is_active_admin());

insert into public.question_bank(test_code,question_number,prompt,question_type,options,duration_seconds,active) values
('test1',1,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya seorang pekerja keras","Saya bukan seorang pemurung"]'::jsonb,15,true),
('test1',2,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka bekerja lebih baik dari orang lain","Saya suka mengerjakan apa yang sedang saya kerjakan sampai selesai"]'::jsonb,15,true),
('test1',3,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menunjukan caranya melaksanakan sesuatu hal","Saya ingin bekerja sebaik mungkin"]'::jsonb,15,true),
('test1',4,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka berkelakar","Saya senang mengatakan kepada orang lain, apa yang harus dilakukan"]'::jsonb,15,true),
('test1',5,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menggabungkan diri dengan kelompok-kelompok","Saya suka diperhatikan oleh kelompok-kelompok"]'::jsonb,15,true),
('test1',6,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang bersahabat intim dengan seseorang","Saya senang bersahabat dengan sekelompok orang"]'::jsonb,15,true),
('test1',7,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya cepat berubah bila hal itu diperlukan","Saya berusaha untuk intim dengan teman-teman"]'::jsonb,15,true),
('test1',8,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka membalas dendam bila saya benar-benar disakiti","Saya suka melakukan hal-hal yang baru dan berbeda"]'::jsonb,15,true),
('test1',9,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya ingin atasan saya menyukai saya","Saya suka mengatakan kepada orang lain bila mereka salah"]'::jsonb,15,true),
('test1',10,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka mengikuti perintah-perintah yang diberikan kepada saya","Saya suka menyenangkan hati orang yang memimpin saya"]'::jsonb,15,true),
('test1',11,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya mencoba sekuat tenaga","Saya seorang yang tertib, saya meletakan segala sesuatu pada tempatnya"]'::jsonb,15,true),
('test1',12,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya membuat orang lain melakukan apa yang saya inginkan","Saya bukan orang yang cepat gusar"]'::jsonb,15,true),
('test1',13,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka mengatakan kepada kelompok, apa yang harus saya lakukan","Saya menekuni satu pekerjaan sampai selesai"]'::jsonb,15,true),
('test1',14,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya ingin tampak bersemangat dan menarik","Saya ingin menjadi sangat sukses"]'::jsonb,15,true),
('test1',15,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menyesuaikan diri dengan kelompok","Saya suka membantu orang lain menentukan pendapatnya"]'::jsonb,15,true),
('test1',16,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya cemas kalau orang lain tidak menyukai saya","Saya sengan kalau orang-orang memperhatikan saya"]'::jsonb,15,true),
('test1',17,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka mencoba sesuatu yang baru","Saya lebih suka bekerja bersama orang-orang daripada bekerja sendiri"]'::jsonb,15,true),
('test1',18,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Kadang-kadang saya menyalahkan orang lain bila terjadi sesuatu kesalahan","saya cemas bila seseorang tidak menyukai saya"]'::jsonb,15,true),
('test1',19,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menyenangkan hati orang yang memimpin syaa","Saya suka mencoba pekerjaan-pekerjaan yang baru dan berbeda"]'::jsonb,15,true),
('test1',20,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka petunjuk yang terinci untuk melakukan sesuatu pekerjaan","Saya suka mengatakan kepada orang lain bila mereka mengganggu saya"]'::jsonb,15,true),
('test1',21,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka mencoba sekuat tenaga","Saya senang bekerja dengan sangat cermat dan hati-hati"]'::jsonb,15,true),
('test1',22,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya seorang pemimpin yang baik","Saya mengorganisir tugas-tugas secara baik"]'::jsonb,15,true),
('test1',23,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya mudah menjadi gusar","Saya seorang yang lambat dalam membuat keputusan"]'::jsonb,15,true),
('test1',24,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang mengerjakan beberapa pekerjaan pada wkatu bersamaan","Bila dalam kelompok, saya lebih suka diam"]'::jsonb,15,true),
('test1',25,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang bila diundang","Saya ingin melakukan sesuatu lebih baik dari orang lain"]'::jsonb,15,true),
('test1',26,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka berteman intim dengan teman-teman saya","Saya suka memberi nasehat kepada orang lain"]'::jsonb,15,true),
('test1',27,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka melakukan hal-hal yang baru dan berbeda","Saya suka menceritakan keberhasilan saya dalam mengerjakan tugas"]'::jsonb,15,true),
('test1',28,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Bila saya benar, saya suka mempertahankannya mati-matian","Saya suka bergabung ke dalam suatu kelompok"]'::jsonb,15,true),
('test1',29,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya tidak mau berbeda dengan orang lain","Saya berusaha untuk sangat intim dengan orang-orang"]'::jsonb,15,true),
('test1',30,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka diajari mengenai caranya mengerjakan suatu pekerjaan","Saya mudah merasa jemu atau bosan"]'::jsonb,15,true),
('test1',31,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka ekerja keras","Saya banyak berfikir dan berencana"]'::jsonb,15,true),
('test1',32,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka memimpin kelompok","Hal-hal yang kecil atau detail sangat menarik hati saya"]'::jsonb,15,true),
('test1',33,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya cepat dan mudah mengambil keputusan","Saya meletakan segala sesuatu secara rapih dan teratur"]'::jsonb,15,true),
('test1',34,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Tugas-tugas saya kerjakan secara cepat","Saya jarang marah atau sedih"]'::jsonb,15,true),
('test1',35,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya ingin menjadi bagian dari kelompok","Pada suatu waktu tertentu, saya hanya ingin mengerjakan satu tugas saja"]'::jsonb,15,true),
('test1',36,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya berusaha untuk intim dengan teman-teman saya","Saya berusaha keras untuk menjadi yang terbaik"]'::jsonb,15,true),
('test1',37,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya menyukai mode baju baru dan tipe-tipe mobil baru","Saya ingin menjadi penanggung jawab bagi orang-orang lain"]'::jsonb,15,true),
('test1',38,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka berdebat","Saya ingin diperhatikan"]'::jsonb,15,true),
('test1',39,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menyenangkan hati orang yang memimpin saya","Saya tertarik menjadi anggota dari suatu kelompok"]'::jsonb,15,true),
('test1',40,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang mengikuti aturan secara tertib","Saya suka orang -orang mengenal saya dengan benar"]'::jsonb,15,true),
('test1',41,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya mencoba sekuat tenaga","Saya sangat menyenangkan"]'::jsonb,15,true),
('test1',42,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Orang lain beranggapan bahwa saya adalah seorang pemimpin yang baik","Saya berfikir jauh ke depan dan terinci"]'::jsonb,15,true),
('test1',43,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Seringkali saya memanfaatkan peluang","Saya senang memperhatkan hal-hal sampai sekecil-kecilnya"]'::jsonb,15,true),
('test1',44,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Orang lain menganggap saya bekerja cepat","Orang lain menganggap saya dapat melakukan penataan yang rapih dan teratur"]'::jsonb,15,true),
('test1',45,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya menyukai permainan-permainan dan olah raga","Saya sangat menyenangkan"]'::jsonb,15,true),
('test1',46,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang bila orang-orang dapat intim dan bersahabat","Saya selalu berusaha menyelesaikan apa yang telah saya mulai"]'::jsonb,15,true),
('test1',47,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka bereksperimen dan mencoba sesuatu yang baru","Saya duka mengerjakan pekerjaan-pekerjaan yang sulit dengan baik"]'::jsonb,15,true),
('test1',48,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang diperlakukan secara adil","Saya senang mengajari orang lain bagaimana caranya mengerjakan sesuatu"]'::jsonb,15,true),
('test1',49,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka mengerjakan apa yang diharapkan dari saya","Saya suka menarik perhatian"]'::jsonb,15,true),
('test1',50,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka petunjuk-petunjuk terinci dalam melaksanakan suatu pekerjaan","Saya senang berada bersama dengan orang-orang lain"]'::jsonb,15,true),
('test1',51,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["saya selalu berusaha mengerjakan tugas secara sempurna","Orang lain menganggap, saya tidak mengenal lelah, dalam bekerja sehari-hari"]'::jsonb,15,true),
('test1',52,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya tergolong tipe pemimpin","Saya mudah berteman"]'::jsonb,15,true),
('test1',53,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya memanfaatkan peluang-peluang","Saya banyak berfikir"]'::jsonb,15,true),
('test1',54,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya bekerja dengan kecepatan yang mantap dan cepat","Saya senang mengerjakan hal-hal detail"]'::jsonb,15,true),
('test1',55,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya memiliki banyak energi untuk permainan-permainan dan olah raga","Saya menempatkan segala sesuatunya secara rapih dan teratur"]'::jsonb,15,true),
('test1',56,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya bergaul baik dengan semua orang","Saya pandai mengendalikan diri"]'::jsonb,15,true),
('test1',57,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya ingin berkenalan dengan orang-orang baru dan mengerjakan hal baru","Saya selalu ingin menyelesaikan pekerjaan yang sudah saya mulai"]'::jsonb,15,true),
('test1',58,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Biasanya saya bersikeras mengenai apa yang saya yakini","Biasanya saya suka bekerja keras"]'::jsonb,15,true),
('test1',59,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menyukai saran-saran dari orang yang saya kagumi","Saya senang mengatur orang lain"]'::jsonb,15,true),
('test1',60,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya biarkan orang-orang lain mempengaruhi saya","Saya suka menerima banyak perhatian"]'::jsonb,15,true),
('test1',61,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Biasanya saya bekerja sangat keras","Biasanya saya bekerja cepat"]'::jsonb,15,true),
('test1',62,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Bila saya berbicara, kelompok akan mendengarkan","Saya terampil mempergunakan alat-alat kerja"]'::jsonb,15,true),
('test1',63,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya lambat membina persahabatan","Saya lambat dalam mengambil keputusan"]'::jsonb,15,true),
('test1',64,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Biasanya saya makan secara cepat","Saya suka membaca"]'::jsonb,15,true),
('test1',65,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya menyukai pekerjaan yang memungkinkan saya berkeliling","Saya menyukai pekerjaan yang harus dilakukan secara teliti"]'::jsonb,15,true),
('test1',66,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya berteman sebanyak mungkin","Saya dapat menemukan hal-hal yang telah saya pindahkan"]'::jsonb,15,true),
('test1',67,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Perencanaan saya jauh ke masa depan","Saya selalu menyenangkan"]'::jsonb,15,true),
('test1',68,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya merasa bangga akan nama baik saya","Saya tetap menekuni satu permasalahan sampai ia terselesaikan"]'::jsonb,15,true),
('test1',69,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka menyenangkan hati orang-orang yang saya kagumi","Saya suka menjadi orang yang berhasil"]'::jsonb,15,true),
('test1',70,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang bila orang-orang lain mengambil keputusan untuk kelompok","Saya suka mengambil keputusan untuk kelompok"]'::jsonb,15,true),
('test1',71,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya selalu berusaha sangat keras","Saya cepat dan mudah mengambil keputusan"]'::jsonb,15,true),
('test1',72,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Biasanya kelompok saya mengerjakan hal-hal yang saya inginkan","Biasanya saya tergesa-gesa"]'::jsonb,15,true),
('test1',73,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya seringkali merasa lelah","Saya lambat dalam mengambil keputusan"]'::jsonb,15,true),
('test1',74,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya bekerja secara cepat","Saya mudah mendapat kawan"]'::jsonb,15,true),
('test1',75,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Biasanya saya bersemangat atau bergairah","Sebagian besar waktu saya untuk berpikir"]'::jsonb,15,true),
('test1',76,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya sangat hangat kepada orang-orang","Saya menyukai pekerjaan yang menuntut ketepatan"]'::jsonb,15,true),
('test1',77,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya banyak berpikir dan merencana","Saya meletakan segala sesuatu pada tempatnya"]'::jsonb,15,true),
('test1',78,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka tugas yang perlu ditekuni sampai kepada hal sedetilnya","Saya tidak cepat marah"]'::jsonb,15,true),
('test1',79,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang mengikuti orang-orang yang saya kagumi","Saya selalu menyelesaikan pekerjaan yang saya mulai"]'::jsonb,15,true),
('test1',80,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya menyukai petunjuk-petunjuk yang jelas","Saya suka bekerja keras"]'::jsonb,15,true),
('test1',81,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya mengejar apa yang saya inginkan","Saya adalah seorang pemimpin yang baik"]'::jsonb,15,true),
('test1',82,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya membuat orang lain bekerja keras","Saya adalah seorang yang \"gampangan\" (tidak banyak pertimbanagan)"]'::jsonb,15,true),
('test1',83,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya membuat keputusan-keputusan secara cepat","Bicara saya cepat"]'::jsonb,15,true),
('test1',84,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Biasanya saya bekerja tergesa-gesa","Secara teratur saya berolah raga"]'::jsonb,15,true),
('test1',85,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya tidak suka bertemu dengan orang-orang","Saya cepat lelah"]'::jsonb,15,true),
('test1',86,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya mempunyai banyak sekali teman","Banyak waktu saya untuk berpikir"]'::jsonb,15,true),
('test1',87,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka bekerja dengan teori","Saya suka bekerja sedetil-detilnya"]'::jsonb,15,true),
('test1',88,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya suka bekeja sampai sedtil-detilnya","Saya suka mengorganisasi pekerja saya"]'::jsonb,15,true),
('test1',89,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya meletakkan segala sesuatu pata tempatnya","Saya selalu menyenangkan"]'::jsonb,15,true),
('test1',90,'Pilihlah satu pernyataan yang paling sesuai dengan diri Anda.','paired_choice','["Saya senang diberi petunjuk mengenai apa yang harus saya lakukan","Saya harus menyelesaikan apa yang sudah saya mulai"]'::jsonb,15,true),
('test2',1,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Mudah bergaul, ramah","Penuh Kepercayaan, percaya pada orang lain","Petualangan, Pengambil Resiko","Toleran, Penuh Hormat"]'::jsonb,30,true),
('test2',2,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Yang penting adalah hasil","Melakukan dengan benar, ketepatan dihitung","Buat menjadi menyenangkan","Mari melakukan bersama"]'::jsonb,30,true),
('test2',3,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Pendidikan, Kebudayaan","Pencapaian, Penghargaan","Keselamatan, Keamanan","Sosial, Pertemuan kelompok"]'::jsonb,30,true),
('test2',4,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Lembut , Pendiam","Optimis, Penghayal","Pusat perhatian, mudah bersosialiasi","Suka mendamaikan, membawa ketenangan"]'::jsonb,30,true),
('test2',5,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Akan melakukan tanpa kontrol diri","Akan membeli berdasarkan hasrat","Akan menunggu, tidak ada tekanan","Akan membelanjakan apa yang saya inginkan"]'::jsonb,30,true),
('test2',6,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Bertanggung jawab, pendekatan langsung","Mudah bergaul, Antusias","Mudah ditebak, konsisten","Waspada, berhati-hati"]'::jsonb,30,true),
('test2',7,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Mendorong orang lain","Berjuang demi kesempurnaan","Menjadi bagian tim","Ingin mencapai tujuan"]'::jsonb,30,true),
('test2',8,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Ramah, mudah berteman","Unik, bosan dengan rutinitas","Aktif merubah sesuatu hal","Menginginkan sesuatu yang pasti"]'::jsonb,30,true),
('test2',9,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Tidak mudah dikalahkan","Melakukan sesuai perintah, mengikuti pimpinan","Riang, ceria","Ingin segalanya teratur, rapi"]'::jsonb,30,true),
('test2',10,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Menjadi Frustasi","Memendam perasaan dalam hati","Menceritakan sisi kehidupan","Berpihak pada oposisi"]'::jsonb,30,true),
('test2',11,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Non Konfrontasi, Mengalah","Penuh dengan rincian","Perubahan pada menit terakhir","Penuntut, Pemarah"]'::jsonb,30,true),
('test2',12,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Saya akan pimpin mereka","Saya akan mengikuti mereka","Saya akan bujuk mereka","Saya akan mendapatkan faktanya"]'::jsonb,30,true),
('test2',13,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Hidup, Cerewet","Bekerja dengan cepat, tekup","Mencoba mempertahankan keseimbangan","Mencoba mengikuti aturan"]'::jsonb,30,true),
('test2',14,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Menginginkan kemajuan","Puas dengan beberapa hal, mudah puas","Menggambarkan perasaan secara terbuka","Rendah hati, sederhana"]'::jsonb,30,true),
('test2',15,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Memikirkan orang lain dahulu","Kompetitif, Menyukai tantangan","Optimis, Positif","Berpikir logis, Sistimatis"]'::jsonb,30,true),
('test2',16,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Mengatur waktu secara efisien","Sering terburu-buru, merasa tertekan","Hal-hal Sosial merupakan hal penting","Menyelesaikan apa yang telah dimulai"]'::jsonb,30,true),
('test2',17,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Tenang, Pendiam","Bahagia, Riang","Menyenangkan, Baik","Tegas, Berani"]'::jsonb,30,true),
('test2',18,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Menyenangkan orang, ramah","Tertawa keras, hidup","Berani, Tegas","Tenang, Pendiam"]'::jsonb,30,true),
('test2',19,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Menolak perubahan mendadak","Cenderung sering berjanji","Menyendiri jika dibawah tekanan","Tidak takut berkelahi"]'::jsonb,30,true),
('test2',20,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Menghabiskan waktu berharga dengan orang lain","Merencanakan masa depan, Menyiapkan diri","Perjalanan menuju petualangan baru","Mendapat penghargaan jika mencapai tujuan"]'::jsonb,30,true),
('test2',21,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Menginginkan kekuasan lebih","Menginginkan kesempatan baru","Menghindari konflik apapun","Menginginkan arah yang jelas"]'::jsonb,30,true),
('test2',22,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Seorang pendukung yang baik","Seorang pendengar yang baik","Seorang penganalisa yang baik","Seorang delegasi yang baik"]'::jsonb,30,true),
('test2',23,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Peraturan perlu ditolak","Peraturan membuat adil","Peraturan membuat bosan","Peraturan membuat aman"]'::jsonb,30,true),
('test2',24,'Pilih satu yang PALING dan satu yang KURANG menggambarkan diri Anda.','most_least','["Bisa diandalkan, bisa digantungkan","Kreatif, Unik","Berorientasi kepada hasil, Inti","Memegang teguh standar tinggi, akurat"]'::jsonb,30,true)
on conflict(test_code,question_number) do update set prompt=excluded.prompt,question_type=excluded.question_type,options=excluded.options,duration_seconds=excluded.duration_seconds;

create or replace function public.start_test_attempt_v2(p_session_token uuid,p_test_code text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_candidate_id uuid; v_attempt public.test_attempts; v_snapshot jsonb; v_random boolean; v_random_options boolean;
begin
  if p_test_code not in ('test1','test2') then raise exception 'Jenis tes tidak valid'; end if;
  select id into v_candidate_id from public.candidates where session_token=p_session_token;
  if v_candidate_id is null then raise exception 'Sesi peserta tidak ditemukan'; end if;
  select coalesce(randomize_questions,true),coalesce(randomize_options,false) into v_random,v_random_options from public.test_settings where test_code=p_test_code and active;
  if v_random is null then raise exception 'Tes sedang tidak aktif'; end if;
  select * into v_attempt from public.test_attempts where candidate_id=v_candidate_id and test_code=p_test_code;
  if found and v_attempt.status='completed' then raise exception 'Tes ini sudah selesai'; end if;
  if not found or v_attempt.question_snapshot is null then
    select jsonb_agg(jsonb_build_object('id',q.id,'number',q.question_number,'type',q.question_type,'prompt',q.prompt,'options',case when v_random_options then (select jsonb_agg(e.value order by random()) from jsonb_array_elements(q.options) e) else q.options end,'duration',q.duration_seconds)
      order by case when v_random then random() else q.question_number::double precision end)
    into v_snapshot from public.question_bank q where q.test_code=p_test_code and q.active;
    if v_snapshot is null then raise exception 'Bank soal belum tersedia'; end if;
    insert into public.test_attempts(candidate_id,test_code,question_snapshot) values(v_candidate_id,p_test_code,v_snapshot)
    on conflict(candidate_id,test_code) do update set question_snapshot=excluded.question_snapshot,status='in_progress'
    returning * into v_attempt;
  end if;
  return coalesce(v_attempt.question_snapshot,v_snapshot);
end; $$;

create or replace function public.get_test_snapshot(p_session_token uuid,p_test_code text)
returns jsonb language sql security definer set search_path=public
as $$ select a.question_snapshot from public.test_attempts a join public.candidates c on c.id=a.candidate_id where c.session_token=p_session_token and a.test_code=p_test_code limit 1; $$;

revoke all on function public.start_test_attempt_v2(uuid,text) from public;
revoke all on function public.get_test_snapshot(uuid,text) from public;
grant execute on function public.start_test_attempt_v2(uuid,text) to anon,authenticated;
grant execute on function public.get_test_snapshot(uuid,text) to anon,authenticated;

grant select,insert,update,delete on public.question_bank to authenticated;
grant select,update on public.test_settings to authenticated;
