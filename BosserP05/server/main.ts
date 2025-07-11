import { Application, Router, oakCors } from "../deps.ts";
import routeStaticFilesFrom from "./util/routeStaticFilesFrom.ts";
import { notificarPrioritarios } from "./util/notificarPrioritarios.ts";
import { packages } from "./config/db.ts";
import { obtenerPaquetesPrioritarios } from "./util/prioridadPaquetes.ts";

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
    const paquetesPendientes = await packages.find({ estado: "Pendiente" }).toArray();
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
// Ruta de health check para Railway
router.get("/health", (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = { status: "OK", timestamp: new Date().toISOString() };
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

// Ejecutar cada 5 minutos 
setInterval(() => {
  notificarPrioritarios();
}, 5 * 60 * 1000);

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Servidor en http://localhost:${port}`);
await app.listen({ port });
