# API Gateway Starter

पहला milestone: Node.js/Express gateway और सफेद theme वाला React health UI। Node.js 22+ और npm चाहिए। दोनों folders की dependencies अलग install होती हैं।

## 1. पहले backend

PowerShell में पहला command:

```powershell
cd C:\Komal_Learning\OneDrive\Documents\all_in_one_Mern\api-gateway-starter\backend
```

फिर एक-एक करके:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

इस terminal को खुला रखें। Browser में `http://localhost:4000/api/health` खोलें। Response में `status: "ok"` आएगा। यह gateway की availability बताता है; future microservices की health नहीं।

## 2. फिर frontend

दूसरे PowerShell terminal में:

```powershell
cd C:\Komal_Learning\OneDrive\Documents\all_in_one_Mern\api-gateway-starter\frontend
npm install
Copy-Item .env.example .env
npm run dev -- --port 5173 --strictPort
```

`http://localhost:5173` खोलें। UI gateway से health fetch करेगा। Refresh button से दोबारा जाँचें। Backend बंद होने पर Unavailable दिखेगा। Fetch timeout 8 seconds है।

## Configuration और विस्तार

- Backend `.env`: `PORT`, `NODE_ENV`, `FRONTEND_ORIGIN`, optional `SERVICE_TARGET`। Startup पर values validate होती हैं।
- Frontend `.env`: `VITE_GATEWAY_URL`। Environment बदलने पर dev server restart / production build दोबारा करें।
- अभी `SERVICE_TARGET` खाली है और proxy route disabled है। Future में वास्तविक HTTP service origin सेट करने पर `/api/service/*` उस upstream के `/*` पर forward होगा। Query और request body stream बने रहते हैं। अधिक services के लिए `src/app.js` में body parsers से पहले explicit proxy mounts जोड़ें।
- Helmet headers, प्रति IP 100 requests/minute, exact frontend CORS origin, generated request IDs, request logs और consistent JSON errors शामिल हैं। CORS authentication नहीं है। Proxy trust default disabled है; deployment के reverse proxy के अनुसार इसे सावधानी से configure करें। Rate limiter memory में है; multiple gateway instances पर shared store चाहिए।
- Local JSON/form bodies 32 KB तक हैं। Future proxy bodies streamed हैं और यह parser limit उन पर लागू नहीं है; upstream को उचित size limit लगानी होगी। HTTP request/header और proxy timeouts bounded हैं।
- Logs में method, URL, status, latency और request ID आते हैं; sensitive query parameters न भेजें।
- UI font Google Fonts से optional load होता है; offline में system font काम करता है।
- Authentication, business services, database, deployment और downstream readiness checks इस milestone में शामिल नहीं हैं।
- आगे protected proxy routes से पहले token-validation middleware जोड़ें: signature, expiry, issuer/audience और permissions की जाँच gateway में होगी। Login, password hashing और token issuance auth service की जिम्मेदारी होगी; gateway में passwords/tokens store नहीं करेंगे। हर नई integration की configuration और failure cases test करने होंगे।

## Verification

Backend: `npm test` — temporary local HTTP servers के साथ health, CORS, headers, errors, oversized bodies, rate limiting और वास्तविक proxy POST forwarding check करता है; test पूरा होने पर servers बंद होते हैं।

Frontend: `npm run build` — production bundle compilation। Browser में live UI verification अलग manual step है। Production UI serve करने पर उसका origin backend configuration में सेट करें।
