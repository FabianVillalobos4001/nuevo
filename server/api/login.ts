import { RouterContext } from "../../deps.ts";
import { Usuario } from "../models/userModel.ts";
import { compare } from "https://deno.land/x/bcrypt@v0.3.0/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.6/mod.ts";
import db from "../config/db.ts"; // ✅ conexión centralizada

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "clave_super_secreta";
const keyBuf = new TextEncoder().encode(JWT_SECRET);
const jwtKey = await crypto.subtle.importKey(
  "raw",
  keyBuf,
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

const usuarios = db.collection<Usuario>("usuarios");

export const loginHandler = async (ctx: RouterContext<"/api/login">) => {
  console.log("🟢 Petición recibida en /api/login");
  try {
    const { correo, password } = await ctx.request.body({ type: "json" }).value;

    if (!correo || !password) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: "Correo y contraseña requeridos" };
      return;
    }

    const user = await usuarios.findOne({ correo });

    if (!user || !user.password) {
      ctx.response.status = 401;
      ctx.response.body = { success: false, message: "Credenciales incorrectas" };
      return;
    }

    const esCorrecta = await compare(password, user.password);

    if (!esCorrecta) {
      ctx.response.status = 401;
      ctx.response.body = { success: false, message: "Credenciales incorrectas" };
      return;
    }

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        correo: user.correo || "",
        tipo: user.tipo || "",
        departamento: user.departamento || "",
        exp: getNumericDate(60 * 60),
      },
      jwtKey,
    );

    ctx.response.status = 200;
    ctx.response.body = {
      tipo: user.tipo,
      correo: user.correo,
      departamento: user.departamento,
      token,
    };
  } catch (error) {
    console.error("❌ Error en loginHandler:", error);
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: "Error interno del servidor" };
  }
};
export default loginHandler;