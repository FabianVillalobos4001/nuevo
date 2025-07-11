# Usar la imagen oficial de Deno
FROM denoland/deno:alpine-2.3.6

# Establecer el directorio de trabajo
WORKDIR /app

# Variables de entorno (debe ir antes de cualquier comando Deno)
ENV PORT=8000
ENV MONGODB_URI=""
ENV NODE_ENV=production
ENV DENO_DIR=/app/.deno_cache

# Copiar todo el proyecto (incluye deps.ts)
COPY . .

# Crear directorio para la caché de Deno y dar permisos al usuario deno
RUN mkdir -p /app/.deno_cache && chown deno:deno /app/.deno_cache

# Usar el caché correcto al hacer deno cache
RUN DENO_DIR=/app/.deno_cache deno cache deps.ts

# Exponer el puerto
EXPOSE 8000

# Ejecutar como usuario no-root por seguridad
USER deno

# Comando para ejecutar el servidor con logs extra
CMD ["sh", "-c", "echo 'Starting Deno server...' && deno run -A server/main.ts"]
