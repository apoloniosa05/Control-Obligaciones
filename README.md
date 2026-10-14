# FiscalControl - MACH Contadores Públicos
> **Sistema Integral de Control de Obligaciones Fiscales (SAT 2026)** con autenticación multiusuario, tablero de seguimiento fiscal en tiempo real, cálculo automatizado de prórrogas conforme al Art. 5.1 CFF y sincronización en la nube.

---

## 🚀 Características Principales

### 🔐 1. Sistema de Autenticación y Registro (Nuevo)
- **Registro de Usuarios**: Alta de nuevos contadores con nombre completo, correo, contraseña cifrada (`scrypt`) y rol asignado (*Contador Titular, Asistente, Auxiliar, Auditor*).
- **Inicio de Sesión Seguro**: Autenticación mediante tokens JWT y cookies `HttpOnly`, con opción para recordar sesión.
- **Acceso Rápido Administrador Demo**: Botón de 1-clic para evaluar y probar el sistema al instante con permisos totales.
- **Gestión de Usuarios (Panel de Administrador)**: Panel exclusivo para el administrador (`al22020503@itsa.edu.mx` o configurable por variable de entorno) que permite supervisar, aprobar o suspender accesos.
- **Modo Resiliente / Híbrido**: Funciona tanto conectado al backend serverless (Netlify Functions + PostgreSQL) como en modo offline/local con `localStorage`, garantizando cero caídas.

### 📊 2. Control y Monitoreo Fiscal
- **Matriz de Cierre Fiscal**: Vista tabular con semáforos interactivos de 1-clic para alternar el estatus de obligaciones (*Presentada*, *En Proceso*, *Vencida*).
- **Cálculo Automático de Prórroga (Art. 5.1 CFF)**: Cálculo dinámico de días hábiles adicionales según el sexto dígito del RFC del contribuyente.
- **Tablero Kanban**: Organización visual de declaraciones por estado de cumplimiento (*Vencidas/Omisas*, *En Proceso*, *Presentadas*).
- **Expediente 360° por Cliente**: Ficha detallada con información fiscal, régimen SAT, desglose de obligaciones, folios de acuses y montos pagados.
- **Modo Oscuro / Modo Claro**: Soporte completo para alternar entre tema día y noche sin parpadeos.
- **Respaldos JSON**: Exportación e importación de bases de datos de clientes con un solo clic.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, Tailwind CSS, FontAwesome 6, JavaScript moderno (ES6+), Glassmorphism UI.
- **Backend**: Netlify Functions v2 (TypeScript / Node.js).
- **Base de Datos & ORM**: Drizzle ORM, Netlify Database (PostgreSQL / Neon).
- **Seguridad**: Hash de contraseñas con `crypto.scrypt` nativo, tokens JWT firmados con HMAC-SHA256.

---

## 📁 Estructura del Proyecto

```text
├── db/
│   ├── index.ts               # Conexión Drizzle ORM con Netlify DB
│   └── schema.ts              # Esquema de tablas (app_users, clients)
├── lib/
│   └── auth.ts                # Utilidades de autenticación, hash, JWT y roles
├── netlify/
│   ├── database/migrations/   # Migraciones SQL de base de datos
│   └── functions/
│       ├── auth.mts           # Endpoints: registro, login, logout, me
│       ├── clients.mts        # Sincronización del padrón de clientes
│       ├── me.mts             # Consulta del usuario autenticado
│       └── users.mts          # Gestión administrativa de usuarios
├── index.html                 # Aplicación Frontend completa (SPA)
├── netlify.toml               # Configuración de despliegue en Netlify
├── drizzle.config.ts          # Configuración de migraciones Drizzle
├── package.json               # Dependencias y scripts
├── .env.example               # Plantilla de variables de entorno
└── .gitignore                 # Archivos excluidos de git
```

---

## 💻 Ejecución Local

### Opción 1: Vista Rápida en Navegador
Simplemente abre `index.html` en tu navegador favorito (Chrome, Edge, Firefox, etc.). El sistema entrará en modo local autónomo y podrás registrar usuarios, iniciar sesión con el acceso rápido demo y gestionar clientes inmediatamente.

### Opción 2: Con Backend Serverless (Netlify Dev)
1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo de Netlify:
   ```bash
   npm run dev
   ```
3. Abre tu navegador en `http://localhost:8888`.

---

## 🌐 Despliegue en Netlify

1. Conecta tu repositorio de GitHub en [Netlify](https://app.netlify.com).
2. Configura las siguientes variables de entorno en la sección **Site Configuration > Environment variables**:
   - `ADMIN_EMAIL`: Tu correo de administrador (ejemplo: `al22020503@itsa.edu.mx`).
   - `JWT_SECRET`: Una cadena segura aleatoria para firmar los tokens.
3. Si deseas persistencia en PostgreSQL en la nube, activa el add-on gratuito de **Netlify Database** en tu panel de Netlify.
4. ¡Listo! Netlify construirá y publicará la aplicación automáticamente.

---

## 📤 Pasos para Subir este Proyecto a GitHub

Si aún no has inicializado el repositorio Git en esta carpeta, ejecuta los siguientes comandos en tu terminal PowerShell o Bash:

```bash
# 1. Inicializar el repositorio Git local
git init

# 2. Agregar todos los archivos preparados
git add .

# 3. Crear el primer commit
git commit -m "feat: implementacion completa de autenticacion, registro, panel admin y control fiscal"

# 4. Establecer la rama principal como 'main'
git branch -M main

# 5. Vincular con tu repositorio remoto de GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 6. Subir el proyecto a GitHub
git push -u origin main
```

---

## 👤 Autor & Licencia

Desarrollado para **MACH Contadores Públicos**.  
Uso interno y profesional para despacho contable.
