const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb+srv://geroveglia_db_user:753e2SAdjOOUAFgX@autolab.xlc1wod.mongodb.net/meli_development';

(async () => {
  const c = await MongoClient.connect(uri);
  const db = c.db();

  const tenantId = new ObjectId('697b6e8a96d9378f31af93fe');

  // Find the cliente role
  const clienteRole = await db.collection('roles').findOne({ tenantId, name: 'cliente' });
  console.log('Cliente role:', clienteRole ? String(clienteRole._id) : 'NOT FOUND');

  if (!clienteRole) {
    console.log('Creating cliente role...');
    const res = await db.collection('roles').insertOne({
      tenantId, name: 'cliente', description: 'Rol para Clientes',
      permissions: ['cuentas:view'], isDefault: false,
      createdAt: new Date(), updatedAt: new Date()
    });
    console.log('Created:', String(res.insertedId));
  }

  const roleId = clienteRole ? clienteRole._id : (await db.collection('roles').findOne({ tenantId, name: 'cliente' }))._id;

  // Fix vegliageronimo user's roles
  const clientId = new ObjectId('699f3325a7688befd1b9152f'); // Meli1 clientes_profiles record
  const result = await db.collection('users').updateOne(
    { email: 'vegliageronimo@gmail.com', tenantId },
    { $set: { roles: [roleId], clientIds: [clientId], clienteId: clientId } }
  );
  console.log('Updated vegliageronimo roles:', result.modifiedCount > 0 ? 'OK' : 'NO CHANGE');

  // Verify
  const user = await db.collection('users').findOne({ email: 'vegliageronimo@gmail.com', tenantId });
  console.log('User:', user.email, 'roles:', user.roles.map(String), 'clientIds:', user.clientIds.map(String));

  await c.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
