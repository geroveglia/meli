<?php
class ROTSIS {
    private $conn;
    private $func;
    public function __construct() {                
        $db = new DB();
        $this->func = new FUNC();
        $this->conn = $db->getConexion();        
        if ($this->conn->connect_error) {
            die("Conexión fallida: " . $this->conn->connect_error);
        }
    }
  
    public function generaExcelComprobantes($cliente_id_lumba, $venta_id_ml, $fecha_creacion_logs){    
        
        $ventas_afectadas = " AND ventas_ml.venta_id_ml = " . $venta_id_ml . " ";
        /*
        include ('class.panel.abm.php');
        $panel = new PANEL();    
        $chequea_si_es_pack = $panel->chequeaSiPack($venta_id_ml);
        
        if($chequea_si_es_pack['venta_ids'] != ""){
            $ventas_afectadas = " AND ventas_ml.venta_id_ml IN(".$chequea_si_es_pack['venta_ids'].") ";
            $pack_id = $chequea_si_es_pack['pack_id'];
        }
        */
        
        $sql_cliente = "SELECT * FROM clientes WHERE Id = '$cliente_id_lumba'";
        $resultado_cliente = $this->conn->query($sql_cliente);
        $row_cliente = mysqli_fetch_assoc($resultado_cliente);          
        $codigo_cliente_rotsis = $row_cliente['codigo_cliente_rotsis'];
        $tipo_comprobante = $row_cliente['tipo_comprobante'];
        $codigo_vendedor = $row_cliente['codigo_vendedor'];
        $codigo_sucursal = $row_cliente['codigo_sucursal'];
        $codigo_lista_precios = $row_cliente['codigo_lista_precios'];

        $sql_venta = "SELECT * FROM ventas_ml WHERE venta_id_ml = '$venta_id_ml'";
        $resultado_venta = $this->conn->query($sql_venta);
        $row_venta = mysqli_fetch_assoc($resultado_venta); 
        $id_venta = $row_venta['Id'];
        
        $nombre_archivo = 'pedidos_'.$id_venta."_". date('Y-m-d_H-i-s').'.csv'; 
        
        $ruta_archivo = __DIR__ . '/../clientes/archivos/'.$cliente_id_lumba.'/comprobantes/'.$nombre_archivo;   
        
        $directorio = dirname($ruta_archivo);
        if (!file_exists($directorio)) {
            if (!mkdir($directorio, 0777, true)) {
                die("Error al crear el directorio: $directorio");
            }
        }
        
        $titulos = array(
            '"id"',
            '"tipo_comprobante"', 
            '"codigo_vendedor"', 
            '"numero_pedido"', 
            '"fecha"', 
            '"fecha_vto_pedido"', 
            '"codigo_cliente"', 
            '"codigo_sucursal"', 
            '"observaciones"', 
            '"neto"',
            '"iva"', 
            '"impuestos_internos"', 
            '"percepciones"', 
            '"total"', 
            '"latitud"', 
            '"longitud"', 
            '"codigo_producto"', 
            '"codigo_lista_precios"', 
            '"codigo_um"', 
            '"cantidad"', 
            '"porc_dto"', 
            '"precio_original"', 
            '"saldos1"', 
            '"saldos2"', 
            '"descuento_general"',
            '"tipo_doc"',
            '"nro_doc"',
            '"cliente_lumba"',
            '"descripcion"',
            '"id_venta_ml"'
        );

        // Array para acumular los datos
        $datos = array();
        $datos[] = $titulos;

        $sql = "SELECT ventas_ml.Id AS Id, 
                             ventas_ml.venta_id_ml AS venta_id_ml, 
                             ventas_ml.fecha_creacion AS fecha_creacion, 
                             ventas_ml.pago_estado AS estado_pago_ml,
                             ventas_ml.comprador_nickname AS comprador_nickname, 
                             ventas_ml.total_envio AS total_envio,  
                             ventas_ml.tipo_doc AS tipo_doc,
                             ventas_ml.dni AS dni,
                             ventas_productos_ml.producto_titulo AS producto_titulo,
                             ventas_productos_ml.producto_id AS producto_id, 
                             ventas_productos_ml.categoria_id AS categoria_id, 
                             ventas_productos_ml.producto_titulo AS producto_titulo,                                           
                             ventas_productos_ml.precio_producto AS precio_producto, 
                             ventas_productos_ml.cantidad AS cantidad, 
                             ventas_productos_ml.aux1 AS aux1                                     
                        FROM ventas_ml 
                   LEFT JOIN ventas_productos_ml ON ventas_ml.venta_id_ml = ventas_productos_ml.venta_id    
                   LEFT JOIN productos_rotsis ON productos_rotsis.producto_id_ml = ventas_productos_ml.producto_id
                       WHERE ventas_ml.pago_estado = 'paid'
                             $ventas_afectadas
                         AND ventas_ml.cliente_id_lumba = '$cliente_id_lumba'  
                         AND ventas_ml.exportado <> 1";      
                                
        $resultado_comproblante = $this->conn->query($sql);           
        $i = 0;
        while ($row = mysqli_fetch_array($resultado_comproblante)) {        
        
            $id = $row['Id'];            
            $fecha_creacion_dts = explode(" ",$row['fecha_creacion']);
            $fecha_creacion = $fecha_creacion_dts[0];
            $precio_producto = $row['precio_producto'];
            $cantidad = $row['cantidad'].".00";
            $tipo_doc = $row['tipo_doc'];
            $producto_titulo = $row["producto_titulo"];     
            $producto_titulo = str_replace(['"', "'", ',', '“', '”', '‘', '’'], '', $producto_titulo);
            $producto_titulo = str_replace(' ', '-', $producto_titulo);           
            $total = $row['precio_producto'] * $row['cantidad'];
            $dni = $row['dni'];
            if($row['tipo_doc'] == 'DNI'){
                $cantidadCaracteres = strlen($row['dni']);
                if($cantidadCaracteres == 8){
                    $dni = "00-".$row['dni']."-0";
                }
                if($cantidadCaracteres == 7){
                    $dni = "000-".$row['dni']."-0";
                }
            }

            if($row['tipo_doc'] == 'CUIT'){
                $parte1 = substr($row['dni'], 0, 2);
                $parte2 = substr($row['dni'], 2, 7);
                $parte3 = substr($row['dni'], 9, 2);                    
                $dni = $parte1 . '-' . $parte2 . '-' . $parte3;
            }
            
            $codigo_rotsis = "SIN-CODIGO";
        
            if($row['aux1'] != ""){
                $codigo_rotsis = $row['aux1'];                    
            }

            $datos[] = array(
                '"' .$id.'"', 
                '"' .$tipo_comprobante.'"', 
                '"' .$codigo_vendedor.'"',
                '"' .$id.'"',
                '"' .$fecha_creacion.'"', 
                '"' .$fecha_creacion.'"', 
                '"' .$codigo_cliente_rotsis.'"', 
                '"' .$codigo_sucursal.'"', 
                '""', 
                '"' .$precio_producto.'"', 
                '"0.00"', 
                '"0.00"', 
                '"0.00"', 
                '"' .$total.'"',
                '"0.00"', 
                '"0.00"', 
                '"' .$codigo_rotsis.'"', 
                '"' .$codigo_lista_precios.'"', 
                '"UNI"', 
                '"' .$cantidad.'"', 
                '"0.00"', 
                '"' .$precio_producto.'"',
                '"0.00"', 
                '"0.00"', 
                '"0.00"',
                '"' .$tipo_doc.'"', 
                '"' .$dni.'"', 
                '"' .$cliente_id_lumba.'"',
                '"' .$producto_titulo.'"',
                '"' .$row['venta_id_ml'].'"'
            );
               
            $mensaje = "genera comprobante pedido " . $venta_id_ml;
            $this->func->insertLogProceso($cliente_id_lumba, $mensaje, 1, $fecha_creacion_logs);  
            $sql = "UPDATE ventas_ml SET exportado = 1 WHERE 1 $ventas_afectadas";            
            $resultado = $this->conn->query($sql);   
            $i++;

        }

        // GENERACION DEL CSV
        $file = fopen($ruta_archivo, 'w');
        if ($file === false) die('No se pudo abrir el archivo para escritura.');
        
        foreach($datos as $fields){
            fputcsv($file, $fields);
        }
        fclose($file);

        $data_content = file_get_contents($ruta_archivo);
        // Clean up quotes
        $data_content = str_replace('"""','"', $data_content);
        // Force CRLF
        $data_content = preg_replace('~(*BSR_ANYCRLF)\R~', "\r\n", $data_content);
        
        if (file_put_contents($ruta_archivo, $data_content)) {
            chmod($ruta_archivo, 0777);
            return["estado" => "ok"];
        } else {
            return["estado" => "nok"];
        }
       
    }

}

?>