console.log("🔄 Iniciando imports...");
import { Application, Router, oakCors } from "../deps.ts";
console.log("✅ Oak imports OK");
import routeStaticFilesFrom from "./util/routeStaticFilesFrom.ts";
console.log("✅ Static files util OK");
import { notificarPrioritarios } from "./util/notificarPrioritarios.ts";
console.log("✅ Notificaciones util OK");
import { packages, getDatabase } from "./config/db.ts";
console.log("✅ Database config OK");
import { obtenerPaquetesPrioritarios } from "./util/prioridadPaquetes.ts";
console.log("✅ Prioridad util OK");

// Controladores
import { handler as verifyResident } from "./api/verify_resident.ts"; // Verifica existencia de residente
import { 
  handler as registrarPaquete, 
  getPaquetesResidente, 
  marcarPaqueteRecibido, 
  notificarPaquetesPrioritarios, 
  getHistorialResidente, 
  getTodosLosPaquetes,
  validarCodigoEntrega
} from "./api/paquetes.ts"; // Funciones relacionadas a paquetes
import { handler as signupResident } from "./api/signup_resident.ts"; // Registro de nuevos residentes
import { loginHandler } from "./api/login.ts"; // Inicio de sesión
import { crearUsuarioHandler } from "./api/admin/crear_usuario.ts"; // Crear usuario por Admin
import { authMiddleware } from "./middleware/authMiddleware.ts"; // Middleware de autenticación

const app = new Application();
const router = new Router();

// ==== Rutas de autenticación ====
router.post("/api/login", loginHandler);                         // Iniciar sesión
router.post("/api/signup_resident", signupResident);             // Registrar un nuevo residente
router.post("/api/verify_resident", verifyResident);             // Verificar si un residente existe

// ==== Rutas de administración ====
router.post("/api/admin/crear_usuario", crearUsuarioHandler);    // Crear usuarios (admin)

// ==== Rutas de paquetes ====
router.post("/api/paquetes", registrarPaquete);                  // Registrar nuevo paquete (sin auth)
router.get("/api/paquetes/residente", authMiddleware, getPaquetesResidente); // Obtener paquetes pendientes de un residente
router.get("/api/paquetes/historial", authMiddleware, getHistorialResidente); // Obtener historial de paquetes de un residente
router.get("/api/paquetes/all", authMiddleware, getTodosLosPaquetes);         // Obtener todos los paquetes (vista conserjería)
router.put("/api/paquetes/:id/recibido", authMiddleware, marcarPaqueteRecibido); // Marcar paquete como recibido
// Endpoint para obtener paquetes prioritarios (solo datos, no notifica por email)
router.get("/api/paquetes/prioritarios", authMiddleware, async (ctx) => {
  try {
    const paquetesPendientes = await (await packages.find({ estado: "Pendiente" })).toArray();
    const prioritarios = obtenerPaquetesPrioritarios(paquetesPendientes);
    ctx.response.status = 200;
    ctx.response.body = { paquetes: prioritarios };
  } catch (_err) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Error al obtener paquetes prioritarios" };
  }
});
router.get("/api/paquetes/notificar-prioritarios", notificarPaquetesPrioritarios); // Notificar por email paquetes prioritarios
router.post("/api/paquetes/validar-codigo", validarCodigoEntrega); // <-- agrega esta línea

// ==== Rutas de health check ====
// Ruta de health check para Railway - SUPER SIMPLE
router.get("/health", (ctx) => {
  ctx.response.status = 200;
  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = { status: "OK" };
});

// ==== Rutas de debug ====
// Ruta de debug para Railway
router.get("/debug", async (ctx) => {
  console.log("🔍 Debug endpoint solicitado");
  try {
    const debugInfo = {
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: {
        port: Deno.env.get("PORT") || "8000",
        nodeEnv: Deno.env.get("NODE_ENV") || "development",
        platform: Deno.build.os,
        arch: Deno.build.arch,
        version: Deno.version.deno
      },
      runtime: {
        cwd: Deno.cwd(),
        hostname: await Deno.hostname?.() || "unknown",
        uptime: performance.now(),
        memory: Deno.memoryUsage?.() || "not available"
      },
      database: {
        status: "checking...",
        uri: Deno.env.get("MONGODB_URI") ? "configured" : "not configured"
      }
    };
    
    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = debugInfo;
    console.log("✅ Debug info enviado");
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error en debug endpoint:", err.message);
    ctx.response.status = 500;
    ctx.response.body = { error: "Debug endpoint failed", message: err.message };
  }
});

// ==== Servir archivos estáticos (frontend) ====
app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(
  routeStaticFilesFrom([
    `${Deno.cwd()}/client/dist`,     // Aplicación compilada
    `${Deno.cwd()}/client/public`,   // Recursos públicos (favicon, imágenes, etc.)
  ])
);

// Ejecutar cada 5 minutos (solo en producción y después de 2 minutos)
if (Deno.env.get("NODE_ENV") === "production") {
  setTimeout(() => {
    setInterval(() => {
      notificarPrioritarios();
    }, 5 * 60 * 1000);
    console.log("📧 Sistema de notificaciones activado");
  }, 2 * 60 * 1000); // Esperar 2 minutos antes de activar
} else {
  console.log("📧 Sistema de notificaciones desactivado en desarrollo");
}

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🚀 Iniciando servidor en puerto ${port}`);
console.log(`🔗 Environment: ${Deno.env.get("NODE_ENV") || "development"}`);
console.log(`🗂️ Working directory: ${Deno.cwd()}`);
console.log(`🌐 MONGODB_URI configured: ${Deno.env.get("MONGODB_URI") ? "YES" : "NO"}`);

try {
  console.log(`🎯 Intentando escuchar en puerto ${port} con hostname 0.0.0.0`);
  await app.listen({ port, hostname: "0.0.0.0" });
  console.log(`✅ Servidor exitosamente iniciado en puerto ${port}`);
} catch (error) {
  const err = error as Error;
  console.error(`❌ Error crítico al iniciar servidor en puerto ${port}:`, err.message);
  console.error(`❌ Stack trace:`, err.stack);
  console.error(`❌ Error completo:`, err);
  Deno.exit(1);
}
