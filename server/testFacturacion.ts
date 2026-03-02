import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * =======================================================
 * SERVICIO 1: CREACIÓN DE CARPETAS Y CREDENCIALES
 * =======================================================
 */
export class ClientEnvironmentService {
  async createClient(clienteId: string | number, basePath: string) {
    const username = `cliente${clienteId}`;

    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    const randomBytes = crypto.randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    const clientRootPath = path.join(basePath, String(clienteId));
    const processedPath = path.join(clientRootPath, 'comprobantes', 'procesados');

    await fs.mkdir(processedPath, { recursive: true });

    return {
      username,
      password,
      path: clientRootPath,
    };
  }
}

export interface ItemVenta {
  producto_titulo: string;
  precio_producto: number;
  cantidad: number;
  aux1?: string;
}

export interface VentaDatos {
  id: string | number;
  venta_id_ml: string | number;
  fecha_creacion: string; 
  tipo_doc: 'DNI' | 'CUIT' | string;
  dni: string;
  items: ItemVenta[];
}

export interface ClienteDatos {
  id_lumba: string | number;
  codigo_cliente_rotsis: string;
  tipo_comprobante: string;
  codigo_vendedor: string;
  codigo_sucursal: string;
  codigo_lista_precios: string;
}

/**
 * =======================================================
 * SERVICIO 2: GENERACIÓN DE COMPROBANTES CSV
 * =======================================================
 */
export class ComprobanteGeneratorService {
  async generateComprobanteCsv(
    basePath: string,
    venta: VentaDatos,
    cliente: ClienteDatos
  ): Promise<string> {
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    const filename = `pedidos_${venta.id}_${formatedDate}.csv`;
    const comprobantesDir = path.join(basePath, String(cliente.id_lumba), 'comprobantes');
    const filePath = path.join(comprobantesDir, filename);

    const titulos = [
      "id", "tipo_comprobante", "codigo_vendedor", "numero_pedido", "fecha", 
      "fecha_vto_pedido", "codigo_cliente", "codigo_sucursal", "observaciones", 
      "neto", "iva", "impuestos_internos", "percepciones", "total", "latitud", 
      "longitud", "codigo_producto", "codigo_lista_precios", "codigo_um", 
      "cantidad", "porc_dto", "precio_original", "saldos1", "saldos2", 
      "descuento_general", "tipo_doc", "nro_doc", "cliente_lumba", "descripcion", 
      "id_venta_ml"
    ];

    const serializeRow = (row: any[]) => row.map(v => `"${v}"`).join(',');
    
    let csvContent = serializeRow(titulos) + '\r\n';

    const fechaManejo = venta.fecha_creacion.split(' ')[0]; 
    const docFormatted = this.formatDocument(venta.tipo_doc, venta.dni);

    for (const item of venta.items) {
      const titleCleaned = this.cleanProductTitle(item.producto_titulo);
      const codigo_rotsis = item.aux1 && item.aux1.trim() !== "" ? item.aux1 : 'SIN-CODIGO';

      const precioFormatted = Number(item.precio_producto).toFixed(2);
      const cantidadFormatted = Number(item.cantidad).toFixed(2);
      const total = item.precio_producto * item.cantidad; 
      
      const row = [
        venta.id,
        cliente.tipo_comprobante,
        cliente.codigo_vendedor,
        venta.id,
        fechaManejo,
        fechaManejo,
        cliente.codigo_cliente_rotsis,
        cliente.codigo_sucursal,
        "",
        precioFormatted,
        "0.00",
        "0.00",
        "0.00",
        total.toString(),
        "0.00",
        "0.00",
        codigo_rotsis,
        cliente.codigo_lista_precios,
        "UNI",
        cantidadFormatted,
        "0.00",
        precioFormatted,
        "0.00",
        "0.00",
        "0.00",
        venta.tipo_doc,
        docFormatted,
        cliente.id_lumba,
        titleCleaned,
        venta.venta_id_ml
      ];

      csvContent += serializeRow(row) + '\r\n';
    }

    await fs.mkdir(comprobantesDir, { recursive: true });
    await fs.writeFile(filePath, csvContent, { encoding: 'utf8' });

    return filePath;
  }

  private cleanProductTitle(title: string): string {
    let cleaned = title.replace(/["',“"”‘’]/g, '');
    cleaned = cleaned.replace(/\s+/g, '-');
    return cleaned;
  }

  private formatDocument(tipoDoc: string, numDoc: string): string {
    if (!numDoc) return '';

    if (tipoDoc === 'DNI') {
      const length = numDoc.length;
      if (length === 8) return `00-${numDoc}-0`;
      if (length === 7) return `000-${numDoc}-0`;
      return numDoc;
    }

    if (tipoDoc === 'CUIT') {
      const parte1 = numDoc.substring(0, 2);
      const parte2 = numDoc.substring(2, 9);
      const parte3 = numDoc.substring(9, 11);
      return `${parte1}-${parte2}-${parte3}`;
    }

    return numDoc;
  }
}

/**
 * =======================================================
 * SCRIPT DE PRUEBA LOCAL
 * =======================================================
 */
async function runLocalTest() {
  console.log('Iniciando prueba local de servicios de facturación...');
  
  // Usamos una carpeta temporal local para no ensuciar el proyecto
  const basePath = path.join(__dirname, 'archivos_test');
  
  try {
    // 1. Probar ClientEnvironmentService
    console.log('\n--- Probando Servicio 1: Creación de Cliente ---');
    const clientService = new ClientEnvironmentService();
    // Simulamos un cliente_id_lumba (como en el CSV de ejemplo: 698)
    const clienteIdSimulado = '698'; 
    const credentials = await clientService.createClient(clienteIdSimulado, basePath);
    console.log('Cliente creado exitosamente:');
    console.log('- Usuario FTP:', credentials.username);
    console.log('- Contraseña generada:', credentials.password);
    console.log('- Ruta de carpetas:', credentials.path);

    // 2. Probar ComprobanteGeneratorService
    console.log('\n--- Probando Servicio 2: Generación CSV ---');
    const invoiceService = new ComprobanteGeneratorService();
    
    // Armamos datos de prueba simulando el CSV que pasaste
    const datosVentaSimulada: VentaDatos = {
      id: '19344',
      venta_id_ml: '2000015311890958',
      fecha_creacion: '2026-02-26T18:49:11.000-04:00',
      tipo_doc: 'DNI',
      dni: '42200526',
      items: [
        {
          producto_titulo: 'Pava Eléctrica Atma 1.7lts Pe1821nap "Negra" Negro', // Ponemos comillas y espacios para ver si limpia bien
          precio_producto: 28500.00,
          cantidad: 1,
          aux1: 'ELE VAR 3888' // codigo_rotsis
        }
      ]
    };

    const datosClienteSimulado: ClienteDatos = {
      id_lumba: clienteIdSimulado,
      codigo_cliente_rotsis: '698',
      tipo_comprobante: '1',
      codigo_vendedor: 'ML',
      codigo_sucursal: '0',
      codigo_lista_precios: '1'
    };

    const csvPath = await invoiceService.generateComprobanteCsv(basePath, datosVentaSimulada, datosClienteSimulado);
    console.log('CSV generado exitosamente en:', csvPath);
    
    // Leemos el archivo para confirmar contenido
    const csvContent = await fs.readFile(csvPath, 'utf8');
    console.log('\nContenido del CSV (primeras líneas):');
    const lines = csvContent.split('\r\n').filter(Boolean);
    lines.forEach(line => console.log(line));
    
    console.log('\n¡Prueba terminada correctamente!');

  } catch (error) {
    console.error('\n❌ Hubo un error durante la prueba:', error);
  }
}

// Ejecutar si llamamos a este script directamente
if (require.main === module) {
  runLocalTest();
}
