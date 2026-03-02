<?php
if($_SERVER['REQUEST_METHOD'] == 'POST'){
  $url_store = rtrim($url_store, '/');
  $url_store = $url_store.'/';
  $sql = "INSERT INTO api_clientes (cliente, token, activo, url_store) VALUES ('$cliente', '$token', '$activo', '$url_store')";
  $rsql = mysqli_query($conexion,$sql);
  $last_id = mysqli_insert_id($conexion);

  // FTP User Logic
  $ftp_user = 'cliente' . $last_id;
  $ftp_pass = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'), 0, 12);
  $ftp_root = '../archivos/rotsis/' . $last_id;

  // Create directory if not exists
  if (!file_exists($ftp_root)) {
    mkdir($ftp_root, 0755, true);
  }
  
  // Create subfolders
  $dir_comprobantes = $ftp_root . '/comprobantes';
  if (!file_exists($dir_comprobantes)) {
    mkdir($dir_comprobantes, 0755, true);
  }
  $dir_procesados = $dir_comprobantes . '/procesados';
  if (!file_exists($dir_procesados)) {
    mkdir($dir_procesados, 0755, true);
  }

  // System commands for user creation (Ubuntu)
  // 1. Create user with home directory
  $cmd_useradd = "sudo /usr/sbin/useradd -d " . realpath($ftp_root) . " -s /usr/sbin/nologin " . $ftp_user;
  shell_exec($cmd_useradd);

  // 2. Set password
  $cmd_passwd = "echo '" . $ftp_user . ":" . $ftp_pass . "' | sudo /usr/sbin/chpasswd";
  shell_exec($cmd_passwd);

  // 3. Set ownership (Recursively covers subfolders created above)
  $cmd_chown = "sudo /usr/bin/chown -R " . $ftp_user . ":" . $ftp_user . " " . realpath($ftp_root);
  shell_exec($cmd_chown);
  
  // Save credentials to DB
  $sql_update = "UPDATE api_clientes SET ftp_user = '$ftp_user', ftp_pass = '$ftp_pass' WHERE Id = $last_id";
  mysqli_query($conexion, $sql_update);

  foreach($_POST['servicio'] as $value){
    $sql = "INSERT INTO api_clientes_servicios (cliente_id, servicio_id) VALUES ('$last_id', '$value')";
    $rsql = mysqli_query($conexion,$sql);
  }
  $mensaje = '<div class="alert alert-info">Usuario agregado satisfactoriamente.</div>';
}
?>
<div class="row">
  <div class="col-12">
    <div class="page-title-box d-sm-flex align-items-center justify-content-between">
      <div>
        <h4 class="mb-sm-0 d-inline-block me-2">Clientes > nuevo</h4>
      </div>
      <div class="page-title-right">
      </div>
    </div>
  </div>
</div>
<div class="row">
  <div class="col-lg-12">
    <div class="card">
      <div class="card-body">
<?php
echo $mensaje;
?>
        <form class="form-horizontal" action="./?route=<?php echo $route;?>&nc=<?php echo $rand;?>" method="POST" enctype="multipart/form-data">
          <div class="form-floating mb-3">
            <input type="text" class="form-control" id="cliente" name="cliente" placeholder="Nombre" required autofocus>
            <label for="cliente">Nombre</label>
          </div>
          <div class="alert alert-info oculto" id="alertoken">
            <div>Luego de guardar el cliente, copie y cargue el siguiente token en el store del cliente.</div>
          </div>
          <div class="input-group mb-3">
            <button class="btn btn-outline-secondary" type="button" data-bs-toggle="modal" data-bs-target="#modaltoken" id="refreshtoken"><i class="fas fa-sync-alt"></i></button>
            <div class="form-floating flex-grow-1">
            <input type="text" class="form-control" id="token" name="token" placeholder="Token" readonly>
            <label for="token">Token</label>
            </div>
          </div>
          <div class="form-floating mb-3">
            <input type="text" class="form-control" id="url_store" name="url_store" placeholder="URL store" required>
            <label for="url_store">URL store</label>
          </div>
          <div class="mb-4">
            <h5>Servicios habilitados</h5>
<?php
$consulta2 = "SELECT * FROM api_servicios ORDER BY servicio";
$resultado2 = mysqli_query($conexion,$consulta2);
while($rArray2 = mysqli_fetch_array($resultado2)){
  echo '
            <div class="form-check form-check-inline form-switch form-switch-md form-switch-warning">
              <input class="form-check-input" type="checkbox" role="switch" id="servicio'.$rArray2['Id'].'" name="servicio[]" value="'.$rArray2['Id'].'">
              <label class="form-check-label" for="servicio'.$rArray2['Id'].'">'.$rArray2['servicio'].'</label>
            </div>
  ';
}
?>
          </div>
          <div class="mb-3">
            <div class="form-check form-switch form-switch-md form-switch-warning">
              <input class="form-check-input" type="checkbox" role="switch" id="activo" name="activo" value="1" checked>
              <label class="form-check-label" for="activo">Activo</label>
            </div>
          </div>
          <div class="text-end mt-3">
            <a href="./?route=clientes&nc=<?php echo $rand;?>" class="btn btn-danger">Volver</a>
            <button type="submit" class="btn btn-warning">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
<div class="modal fade" id="modaltoken" tabindex="-1" aria-labelledby="modaltoken" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel">Generar nuevo token</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="alert alert-warning">Está a punto de generar un nuevo TOKEN, una vez que haya guardado la información del cliente, debe copiarlo y cargarlo en el store del cliente.</div>
      </div>
      <div class="modal-footer justify-content-center">
        <button type="button" class="btn btn-danger" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-warning" id="generartoken"><i class="fas fa-sync-alt"></i> Generar nuevo token</button>
      </div>
    </div>
  </div>
</div>
<script>
$("#generartoken").click(function(){
  $.ajax({
    url: 'ajax/token.php',
    type: 'POST',
    data: {
    },
    success: function(data) {
      $('#token').val(data);
      $('#alertoken').show(100);
      $('#modaltoken').modal('hide');
    }
  });
});
$('#generartoken').trigger("click");
</script>