import { resetUsersToOnlyAdmin } from "../lib/auth.js";

async function main() {
  console.log("Iniciando restablecimiento de cuentas de usuario...");
  try {
    const result = await resetUsersToOnlyAdmin();
    console.log("✓ Operación completada con éxito.");
    console.log(`✓ Cuenta de administrador configurada: ${result.adminEmail}`);
    console.log("✓ Se eliminaron todas las demás cuentas de la base de datos.");
    process.exit(0);
  } catch (error: any) {
    console.error("✗ Error al restablecer usuarios:", error?.message || error);
    process.exit(1);
  }
}

main();
