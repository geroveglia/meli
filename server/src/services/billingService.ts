import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = "C:\\wamp64\\www\\meli\\server\\server_debug.log";
const logDebug = (msg: string) => {
    try {
        fs.appendFileSync(LOG_FILE, `[BillingService] [${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { console.error("Log failed", e); }
};

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

    await fsPromises.mkdir(processedPath, { recursive: true });

    return {
      username,
      password,
      path: clientRootPath,
    };
  }
}

export class ComprobanteGeneratorService {
  async generateComprobanteCsv(
    basePath: string,
    venta: VentaDatos,
    cliente: ClienteDatos
  ): Promise<string> {
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    
    // File format as requested
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

    // Parse 'YYYY-MM-DDTHH:MM:SS...' to 'YYYY-MM-DD' if there's a space/T depending on format. 
    // The previous PHP split by space, but TS ISO dates have 'T'. We'll handle both.
    const dateSplitChar = venta.fecha_creacion.includes('T') ? 'T' : ' ';
    const fechaManejo = venta.fecha_creacion.split(dateSplitChar)[0]; 
    const docFormatted = this.formatDocument(venta.tipo_doc, venta.dni);

    for (const item of venta.items) {
      const titleCleaned = this.cleanProductTitle(item.producto_titulo);
      const codigo_rotsis = item.aux1 && item.aux1.trim() !== "" ? item.aux1 : 'SIN-CODIGO';

      const precioFormatted = Number(item.precio_producto).toFixed(2);
      const cantidadFormatted = Number(item.cantidad).toFixed(2);
      const total = item.precio_producto * item.cantidad; 
      
      const row = [
        venta.id, // Id interno venta
        cliente.tipo_comprobante,
        cliente.codigo_vendedor,
        venta.id, // numero_pedido = Id interno
        fechaManejo,
        fechaManejo,
        cliente.codigo_cliente_rotsis,
        cliente.codigo_sucursal,
        "", // observaciones vacías
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

    await fsPromises.mkdir(comprobantesDir, { recursive: true });
    await fsPromises.writeFile(filePath, csvContent, { encoding: 'utf8' });

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
      const p1 = numDoc.substring(0, 2);
      const p2 = numDoc.substring(2, 9);
      const p3 = numDoc.substring(9, 11);
      return `${p1}-${p2}-${p3}`;
    }

    return numDoc;
  }
}

export const clientEnvironmentService = new ClientEnvironmentService();
export const comprobanteGeneratorService = new ComprobanteGeneratorService();

import { Order, IOrder } from '../models/Order.js';
import { Tenant, ITenant } from '../models/Tenant.js';
import { Cuenta } from '../models/Cuenta.js';

/**
 * Función principal para despachar la facturación manual o automática.
 * Lee de la base de datos la Orden y el Tenant/Cuenta para generar el CSV local.
 */
export async function processInvoice(orderId: string | mongoose.Types.ObjectId) {
  try {
    logDebug(`Starting process for order ID: ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      logDebug(`Order ${orderId} not found in DB`);
      throw new Error(`Order ${orderId} not found`);
    }

    logDebug(`Order found: ${order.meliId}`);

    const tenant = await Tenant.findById(order.tenantId);
    if (!tenant) {
      logDebug(`Tenant ${order.tenantId} not found`);
      throw new Error(`Tenant for order ${orderId} not found`);
    }

    logDebug(`Tenant found: ${tenant.name}`);

    let cuenta = null;
    if (order.clientId) {
      cuenta = await Cuenta.findById(order.clientId);
      logDebug(`Cuenta found: ${cuenta?.name}`);
    } else {
      logDebug(`No clientId on order, skipping Cuenta check`);
    }

    const ventaPayload: VentaDatos = {
      id: order._id.toString(),
      venta_id_ml: order.meliId,
      fecha_creacion: order.dateCreated ? order.dateCreated.toISOString() : new Date().toISOString(),
      tipo_doc: 'DNI', 
      dni: order.buyer?.id ? order.buyer.id.toString() : '0', 
      items: (order.items || []).map(item => ({
        producto_titulo: item.title || 'Unknown',
        precio_producto: item.unitPrice || 0,
        cantidad: item.quantity || 1,
        aux1: item.id
      }))
    };

    const clientePayload: ClienteDatos = {
      id_lumba: order.clientId ? order.clientId.toString() : tenant._id.toString(),
      codigo_cliente_rotsis: '698',
      tipo_comprobante: '1',
      codigo_vendedor: 'ML',
      codigo_sucursal: '0',
      codigo_lista_precios: '1'
    };

    const storePath = path.resolve(__dirname, '../../archivos_test');
    logDebug(`Saving CSV to base path: ${storePath}`);
    
    const csvPath = await comprobanteGeneratorService.generateComprobanteCsv(
      storePath, 
      ventaPayload, 
      clientePayload
    );
    
    logDebug(`✅ Created invoice CSV for order ${order.meliId} at ${csvPath}`);

    order.salesStatus = 'facturada';
    await order.save();

    return csvPath;
  } catch (err: any) {
    logDebug(`Failed to process invoice for order ${orderId}: ${err.message}`);
    console.error(`[Invoice Generator] Failed to process invoice for order ${orderId}:`, err);
    throw err;
  }
}

