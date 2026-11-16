# AI Web Blueprint — Türkçe Kullanım Kılavuzu (`web-blueprint` / `Atölye Pusula`)

Bu depo (`ai-web-blueprint`, kök `package.json` ve `AGENTS.md` içinde `web-blueprint` paket adıyla tanımlıdır); yapay zekâ kodlama ajanlarının (Antigravity, Codex CLI, Claude Code, Cursor, GitHub Copilot) tahmin yürütmeden, dağınık mimari üretmeden ve "her şey hazır" diyerek test edilmemiş kod bırakmadan **gerçek çalışan web uygulamaları** geliştirmesi için hazırlanmış mühendislik standartları ve referans şablon sistemidir.

---

## Neden Sadece Repo Linki Paylaşmak Yetmez?

Birçok kullanıcı bir sohbet ekranına yalnızca GitHub depo linkini yapıştırıp *"Buna göre bana site yap"* der. **Bu yöntem çoğu zaman işe yaramaz** çünkü:
1. Web tabanlı yalnızca-sohbet (chat-only) modeller deponun içindeki `AGENTS.md`, `standards/`, `presets/` ve `.agents/skills/` dosyalarının tamamını otomatik okumaz; yalnızca yüzeysel bir özet görebilir veya hiç okuyamayabilir.
2. Sohbet kutuları yerel bilgisayarınızda `npm install`, veritabanı migration (`db:migrate`), negatif güvenlik testleri (`vitest`) veya Playwright ekran görüntüsü denetimi çalıştıramaz.
3. Çalıştırılmayan kontroller doğrulanmış sayılmaz.

### Doğru Kullanım: CLI / IDE Ajanı vs. Yalnızca-Sohbet Modeller

| Kullanım Şekli | Nasıl Çalıştırmalısınız? | Neleri Yapabilir / Yapamaz? |
| --- | --- | --- |
| **CLI veya IDE Kodlama Ajanı (Önerilen)** *(Antigravity, Codex CLI, Claude Code, Cursor, VS Code Copilot)* | Depoyu bilgisayarınıza klonlayın, klasörü IDE/terminalde açın ve `BOOTSTRAP_PROMPT.md` içindeki Türkçe istemi yapıştırın. | `AGENTS.md` ve `standards/` dosyalarını doğrudan okur, kodu yazar, migration/test/build çalıştırır ve kanıtları raporlar. |
| **Yalnızca-Sohbet Web Arayüzü** *(Terminal/dosya erişimi olmayan chat ekranı)* | Yalnızca repo URL'si vermeyin. `AGENTS.md` + seçtiğiniz `presets/*.md` + ilgili `standards/*.md` içeriklerini sohbete yapıştırın. | Tasarım/brief/taslak kod önerebilir; ancak **test, build ve güvenlik başlığı doğrulaması yapamaz**. Üretilen kodu yerelde kendiniz test etmelisiniz. |

---

## Adım Adım Kurulum ve Çalıştırma (Windows PowerShell)

**Gereksinimler:** Node.js `>= 20` LTS, `npm` ve `git`.  
*(Not: Windows makinenizde Docker veya yerel PostgreSQL kurulu olmasa bile referans uygulama gömülü **`@electric-sql/pglite`** desteği ile gerçek PostgreSQL SQL migration'larını çalıştırır.)*

### 1. Ortamı ve Depo Sağlığını Kontrol Edin

```powershell
# Node, npm, Git ve opsiyonel Docker/psql durumunu kontrol eder
npm run doctor

# Araç adaptör dosyalarının (CLAUDE.md, GEMINI.md, .cursor, .github) senkronizasyonunu doğrular
npm run check:adapters

# Depo yapısı ve temiz klasöre proje üretme (smoke) testlerini çalıştırır
npm run test:repo
```

### 2. Referans Uygulamayı (`templates/fullstack/`) Ayağa Kaldırın

```powershell
# 1. Bağımlılıkları kilit dosyasından (npm ci) kurun
npm run fullstack:install

# 2. Örnek çevre değişkenlerini kopyalayın (varsayılan pglite://./.data/pgdata kullanır)
Copy-Item templates\fullstack\.env.example templates\fullstack\.env

# 3. Veritabanı tablolarını gerçek Drizzle SQL migration'ları ile oluşturun
npm run fullstack:migrate

# 4. Örnek organizasyon ve kullanıcıları yükleyin (yalnızca geliştirme ortamı için)
npm run fullstack:seed

# 5. Geliştirme sunucusunu başlatın (http://localhost:3000)
npm run fullstack:dev
```

*(Opsiyonel — Docker kuruluysa):* Gerçek `postgres:16-alpine` ve yerel e-posta yakalayıcı `Mailpit` için `templates/fullstack` klasöründe `docker compose up -d` çalıştırıp `.env` içindeki `postgresql://...` satırını açabilirsiniz. Docker yoksa uygulama e-posta doğrulama ve şifre sıfırlama bağlantılarını otomatik olarak `.data/mailpit-outbox.json` ve geliştirme `/api/dev/outbox` uç noktasına yazar.

### 3. Yeni Bir Proje Klasörü Oluşturma

Bu şablon deposunun içinde değil, temiz bir proje klasöründe çalışmak için:

```powershell
npm run create:project -- --name benim-projem --target C:\projeler\benim-projem
```

Oluşturulan projede `cd C:\projeler\benim-projem` sonrası `npm install`, `Copy-Item .env.example .env`, `npm run db:migrate`, `npm run dev` adımlarını izleyebilirsiniz. Ayrıca oluşturulan projede sürüm takibi için `.blueprint-manifest.json` dosyası kaydedilir (`docs/upgrading.md`).

### 4. Kalite, Güvenlik ve Build Kontrollerini Çalıştırma

```powershell
# Tek tek kontroller:
npm run fullstack:lint
npm run fullstack:typecheck
npm run fullstack:test
npm run fullstack:build

# Veya tüm depo + uygulama doğrulamasını tek komutta çalıştırın:
npm run verify
```

Playwright uçtan uca (E2E) tarayıcı testlerini çalıştırmak için (ilk kullanımda tarayıcı ikilileri gerekebilir: `npx --prefix templates/fullstack playwright install chromium`):

```powershell
npm run fullstack:e2e
```

---

## macOS / Linux Notları

Komutlar aynıdır; yalnızca `.env` kopyalama ve hedef yol biçimini bash sözdizimine göre yazın:

```bash
cp templates/fullstack/.env.example templates/fullstack/.env
npm run create:project -- --name my-app --target ~/projects/my-app
```

---

## Ajan ile İlk İstem (Kopyala-Yapıştır)

Depoyu bir kodlama ajanında açtıktan sonra [`BOOTSTRAP_PROMPT.md`](BOOTSTRAP_PROMPT.md) içindeki şu istemi `[FİKİR]` kısmını doldurarak gönderin:

```text
Bu çalışma alanındaki AGENTS.md ve görevimle ilgili standards/preset dosyalarını oku. İlgili dosya yollarını ve seçtiğin profili belirt. Site fikrim: [FİKİR]. Eksik kritik bilgileri netleştir; brief, tasarım yönü ve kabul ölçütlerini kaydet. Ardından gerçek çalışan uygulamayı oluştur, kontrolleri çalıştır ve kanıtları raporla. Çalıştırılmayan testleri açıkça ayır. Güvenlik veya tasarım kalitesi hakkında doğrulanmamış garanti verme.
```

---

## Dürüst Kapsam ve Uyarılar

- **Basit tanıtım siteleri için tam yığın kurmayın:** Sadece statik tanıtım/portföy sitesi yapıyorsanız `presets/static-site.md` profilini kullanın; veritabanı ve üyelik paneli eklemeyin. *(Not: `static-site`, `existing-project` ve `python-fastapi-ai` profilleri rehber niteliğindedir; otomatik kod üreten ayrı şablonlar yalnızca `templates/fullstack/` için mevcuttur.)*
- **Araç uyumluluğu şeffaflığı:** Antigravity, Codex, Claude Code, Cursor ve Copilot adaptör dosyaları üretilmiş ve dokümantasyona göre hizalanmıştır; ancak **bu çalışma ortamında yalnızca Antigravity fiilen çalıştırılarak denenmiştir** (`adapters/README.md`).
- **Sıfır açık garantisi verilmez:** Güvenlik kontrolleri OWASP ASVS v5.0.0 hedefleriyle eşleştirilmiştir (`standards/security.md`), fakat hiçbir şablon tek başına "hacklenemez" veya otomatik KVKK/GDPR/WCAG uyumluluğu garantisi vermez. Canlı ortama çıkarken `TEST_DATABASE_URL` test izolasyonunu koruyun; `TRUSTED_ORIGINS`, `TRUST_PROXY` (`none` / `cloudflare` / `fly` / `hops:<N>`), `RATE_LIMIT_DRIVER=postgres`, `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`/`SMTP_REQUIRE_TLS` ve (açıldıysa `ALLOW_PROD_DEFERRED_EMAIL_QUEUE=true` ile `processEmailOutboxRetries()` işleyicisi) ayarlarını [`docs/deployment.md`](docs/deployment.md) ve [`SECURITY.md`](SECURITY.md) adımlarına göre yapılandırın.
