import { verify } from "https://deno.land/x/djwt@v2.6/mod.ts"; // Importa la función verify para verificar tokens JWT
import { RouterContext } from "../../deps.ts"; // Importa el tipo RouterContext para trabajar con middleware de Oak

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "clave_super_secreta"; // Obtiene la clave secreta del entorno o usa una por defecto
const keyBuf = new TextEncoder().encode(JWT_SECRET); // Codifica la clave secreta como bytes
const jwtKey = await crypto.subtle.importKey( // Importa la clave en formato que puede usar la API WebCrypto
  "raw", // Tipo de clave sin procesar
  keyBuf, // Bytes codificados de la clave
  { name: "HMAC", hash: "SHA-256" }, // Algoritmo HMAC con hash SHA-256
  false, // No permite exportar la clave
  ["sign", "verify"], // Permite firmar y verificar
);

export const authMiddleware = async ( // Define el middleware de autenticación
  ctx: RouterContext, // Contexto de la petición
  next: () => Promise<unknown> // Función para pasar al siguiente middleware
) => {
  console.log("🛡️ Entrando a authMiddleware..."); // Log para saber cuándo entra al middleware

  const authHeader = ctx.request.headers.get("Authorization"); // Obtiene el header Authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) { // Verifica que el header tenga formato Bearer
    console.warn("🔒 Token no proporcionado o formato incorrecto");
    ctx.response.status = 401; // Devuelve 401 (no autorizado)
    ctx.response.body = { message: "Token no proporcionado o formato inválido." };
    return;
  }

  const token = authHeader.split(" ")[1]; // Extrae el token después de "Bearer"

  try {
    const payload = await verify(token, jwtKey, "HS256"); // Verifica el token usando la clave y algoritmo HMAC-SHA256

    if (!payload || typeof payload !== "object" || !payload.correo || !payload.tipo) { // Verifica estructura mínima del token
      console.warn("❌ Token con estructura inválida:", payload);
      ctx.response.status = 401;
      ctx.response.body = { message: "Token inválido: estructura incompleta." };
      return;
    }

    const tipo = payload.tipo; // Extrae el tipo de usuario
    const departamento = payload.departamento; // Extrae el departamento si existe

    if ( // Si el usuario es Residente, debe tener departamento válido
      tipo === "Residente" &&
      (!departamento || typeof departamento !== "string" || departamento.trim() === "")
    ) {
      console.warn("❌ Residente sin departamento:", payload);
      ctx.response.status = 401;
      ctx.response.body = { message: "Residente sin departamento válido." };
      return;
    }

    if (tipo !== "Residente" && tipo !== "Conserjeria" && tipo !== "Admin") { // Verifica que el tipo sea válido
      console.warn("❌ Tipo de usuario no permitido:", payload);
      ctx.response.status = 403; // Prohibido
      ctx.response.body = { message: "Tipo de usuario no autorizado." };
      return;
    }

    ctx.state.user = payload; // Guarda la información del usuario en el estado de la petición
    console.log(`✅ Usuario autenticado: ${payload.correo} (${tipo})`);
    await next(); // Continúa al siguiente middleware o ruta
  } catch (err) {
    console.error("❌ Error verificando token:", err); // Si falla la verificación
    ctx.response.status = 401; // No autorizado
    ctx.response.body = { message: "Token inválido o expirado." };
  }
};