import { handlers } from "../../../../../auth";

// Sin esto, Next.js optimiza este handler como estático y cachea la
// respuesta (providers/csrf/session) con el host disponible en build time
// (ninguno real => cae a localhost) en vez de leerlo de cada request.
export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
