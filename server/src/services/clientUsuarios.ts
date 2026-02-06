import { Types } from "mongoose";
import { Cuenta } from "../models/Cuenta.js";

interface AddUserToClientParams {
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  userId: Types.ObjectId;
  permiso?: "ver" | "editar";
}

export async function addUserToClientUsuarios({
  tenantId,
  clientId,
  userId,
  permiso = "ver",
}: AddUserToClientParams): Promise<void> {
  const cuenta = await Cuenta.findOne({ _id: clientId, tenantId });

  if (!cuenta) {
    throw new Error("Cuenta not found");
  }

  const existingUser = cuenta.usuarios?.find(
    (u) => u.userId.toString() === userId.toString()
  );

  if (existingUser) {
    existingUser.permiso = permiso;
  } else {
    if (!cuenta.usuarios) {
      cuenta.usuarios = [];
    }
    cuenta.usuarios.push({ userId, permiso });
  }

  await cuenta.save();
}

export async function removeUserFromClientUsuarios(
  tenantId: Types.ObjectId,
  clientId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<void> {
  const cuenta = await Cuenta.findOne({ _id: clientId, tenantId });

  if (!cuenta) {
    throw new Error("Cuenta not found");
  }

  if (cuenta.usuarios) {
    cuenta.usuarios = cuenta.usuarios.filter(
      (u) => u.userId.toString() !== userId.toString()
    );
    await cuenta.save();
  }
}
