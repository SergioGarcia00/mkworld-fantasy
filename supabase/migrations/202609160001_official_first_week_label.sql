-- La primera semana usa la liga oficial actual; no debe mostrarse como liga de pruebas.
update public.app_config
set test_mode = false
where id = true;

