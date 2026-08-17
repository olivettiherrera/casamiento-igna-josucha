/* Igna & Josucha — lista de regalos de luna de miel
   Vanilla JS, sin build. Los datos salen del Apps Script; si no hay
   API_URL configurada, corre en modo demo con los ítems de DEMO_ITEMS. */

(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  var cfg = window.CONFIG || {};

  var estado = {
    config: {},
    items: [],
    demo: false,
    item: null,
    monto: 0
  };

  // ───────────────────────── Datos demo ─────────────────────────
  // Espejo de ITEMS_DEMO en Codigo.gs. Es un itinerario de ejemplo:
  // Igna y Josucha lo reemplazan por el viaje real desde el Sheet.

  var DEMO_ITEMS = [
    ['vuelos-japon',   10, 'En camino', 'Los pasajes a Japón',          'Dos aéreos Buenos Aires → Tokio. El ítem más grande de la lista: está pensado para que lo junten entre varios.', 4200000, '✈️', 1150000],
    ['almuerzo-ezeiza',20, 'En camino', 'El almuerzo en el aeropuerto', 'Ese sanguche carísimo de Ezeiza antes de subir al avión. Chiquito, pero alguien lo tiene que pagar.',                35000, '🥪',   35000],
    ['noche-tokio',    30, 'Japón',     'La primera noche en Tokio',    'Llegar muertos a Shinjuku y dormir catorce horas seguidas.',                                                        180000, '🏙️',   90000],
    ['omakase',        40, 'Japón',     'Una cena omakase',             'Sentarse en la barra y dejar que el itamae decida todo por nosotros.',                                              220000, '🍣',       0],
    ['jr-pass',        50, 'Japón',     'El Japan Rail Pass',           'Siete días de trenes ilimitados para los dos. La forma de recorrer el país.',                                       650000, '🚄',  200000],
    ['tren-kioto',     60, 'Japón',     'El tren bala a Kioto',         'Tokio → Kioto en poco más de dos horas, con el Fuji por la ventanilla si hay suerte.',                              190000, '🗻',       0],
    ['ryokan-kioto',   70, 'Japón',     'Tres noches en un ryokan',     'Tatami, onsen y desayuno tradicional en una posada de Kioto.',                                                      520000, '🏮',  310000],
    ['ceremonia-te',   80, 'Japón',     'Una ceremonia del té en Gion',  'La versión larga, la que dura dos horas y hay que aprender a arrodillarse.',                                         95000, '🍵',       0],
    ['fushimi-inari',  90, 'Japón',     'Fushimi Inari al amanecer',    'Los diez mil torii naranjas a las seis de la mañana, antes de que llegue nadie.',                                    70000, '⛩️',   70000],
    ['osaka-comida',  100, 'Japón',     'Una noche de comida en Osaka', 'Dotonbori, takoyaki y okonomiyaki hasta no poder más.',                                                             160000, '🍢',       0],
    ['vuelo-manila',  110, 'En camino', 'El vuelo Tokio → Manila',      'El salto de la ciudad al Pacífico.',                                                                                780000, '🛫',  120000],
    ['vuelo-palawan', 120, 'Filipinas', 'El vuelo interno a Palawan',   'Manila → Puerto Princesa, la puerta de entrada a las islas.',                                                       240000, '🛩️',       0],
    ['islas-elnido',  130, 'Filipinas', 'La excursión a El Nido',       'Día completo en bote por las lagunas y las playas escondidas del archipiélago.',                                    180000, '🏝️',   45000],
    ['hotel-palawan', 140, 'Filipinas', 'Cuatro noches frente al mar',  'Un bungalow en Palawan con el agua a veinte metros.',                                                               640000, '🌅',       0],
    ['buceo-coron',   150, 'Filipinas', 'Un día de buceo en Corón',     'Bajar a ver los barcos hundidos de la Segunda Guerra.',                                                             210000, '🤿',       0],
    ['libre',         999, 'Libre',     'Lo que ustedes quieran',       'Si nada de la lista te cierra, o preferís que lo usemos en lo que haga falta, poné el monto que quieras.',                0, '💌',       0]
  ].map(function (r) {
    var precio = r[5], recaudado = r[7];
    return {
      id: r[0], orden: r[1], categoria: r[2], titulo: r[3], descripcion: r[4],
      precio: precio, emoji: r[6], imagen: '',
      recaudado: recaudado,
      aportes: recaudado > 0 ? 1 : 0,
      completo: precio > 0 && recaudado >= precio,
      restante: precio > 0 ? Math.max(0, precio - recaudado) : 0
    };
  });

  // ───────────────────────── Utilidades ─────────────────────────

  function pesos(n) {
    return '$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  }

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2000);
  }

  function copiar(texto, etiqueta) {
    var ok = function () { toast(etiqueta + ' copiado'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(ok, function () { copiarFallback(texto, ok); });
    } else {
      copiarFallback(texto, ok);
    }
  }

  // Safari viejo y contextos no seguros: execCommand sigue siendo el camino.
  function copiarFallback(texto, ok) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    try { document.execCommand('copy'); ok(); } catch (e) { toast('No se pudo copiar'); }
    document.body.removeChild(ta);
  }

  // ───────────────────────── Carga ─────────────────────────

  function cargar() {
    if (!cfg.API_URL) {
      estado.demo = true;
      estado.config = cfg.FALLBACK || {};
      estado.items = DEMO_ITEMS;
      render();
      return;
    }

    fetch(cfg.API_URL + '?action=items')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'Respuesta inválida');
        estado.config = Object.assign({}, cfg.FALLBACK, data.config);
        estado.items = data.items || [];
        render();
      })
      .catch(function (err) {
        console.error('No se pudo leer el Sheet, uso datos demo:', err);
        estado.demo = true;
        estado.config = cfg.FALLBACK || {};
        estado.items = DEMO_ITEMS;
        render();
      });
  }

  // ───────────────────────── Render ─────────────────────────

  function render() {
    var c = estado.config;
    if (c.titulo_sitio) {
      $('#siteTitle').textContent = c.titulo_sitio;
      document.title = c.titulo_sitio + ' — Nuestra luna de miel';
    }
    if (c.mensaje_intro) $('#introText').textContent = c.mensaje_intro;

    $('#demoBanner').hidden = !estado.demo;
    $('#loading').hidden = true;

    var cont = $('#items');
    cont.hidden = false;
    cont.innerHTML = '';

    // Agrupamos por categoría respetando el orden de aparición del Sheet.
    var grupos = [];
    var index = {};
    estado.items.forEach(function (it) {
      var cat = it.categoria || 'Regalos';
      if (!index[cat]) { index[cat] = { nombre: cat, items: [] }; grupos.push(index[cat]); }
      index[cat].items.push(it);
    });

    grupos.forEach(function (g) {
      var h = document.createElement('div');
      h.className = 'cat';
      h.innerHTML = '<h2 class="cat__name"></h2><span class="cat__rule"></span>';
      h.querySelector('.cat__name').textContent = g.nombre;
      cont.appendChild(h);
      g.items.forEach(function (it) { cont.appendChild(tarjeta(it)); });
    });
  }

  function tarjeta(it) {
    var b = document.createElement('button');
    b.className = 'card';
    b.type = 'button';

    var thumb = document.createElement('span');
    thumb.className = 'card__thumb';
    if (it.imagen) thumb.style.backgroundImage = 'url(' + it.imagen + ')';
    else thumb.textContent = it.emoji || '🎁';

    var body = document.createElement('div');
    body.className = 'card__body';

    var t = document.createElement('h3');
    t.className = 'card__title';
    t.textContent = it.titulo;

    var d = document.createElement('p');
    d.className = 'card__desc';
    d.textContent = it.descripcion;

    body.appendChild(t);
    body.appendChild(d);

    if (it.precio > 0) {
      var pct = Math.min(100, Math.round((it.recaudado / it.precio) * 100));

      var bar = document.createElement('div');
      bar.className = 'bar';
      var fill = document.createElement('div');
      fill.className = 'bar__fill' + (it.completo ? ' bar__fill--done' : '');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      body.appendChild(bar);

      var meta = document.createElement('p');
      meta.className = 'meta';
      if (it.completo) {
        meta.innerHTML = '<strong>¡Ya está regalado!</strong> ' + pesos(it.precio);
      } else if (it.recaudado > 0) {
        meta.innerHTML = '<strong>' + pesos(it.recaudado) + '</strong> de ' + pesos(it.precio) +
                         ' · faltan ' + pesos(it.restante);
      } else {
        meta.innerHTML = '<strong>' + pesos(it.precio) + '</strong>';
      }
      body.appendChild(meta);

      if (it.completo) {
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Completo · igual podés sumarte';
        body.appendChild(badge);
      }
    } else {
      var libre = document.createElement('p');
      libre.className = 'meta';
      libre.innerHTML = '<strong>El monto que quieras</strong>';
      body.appendChild(libre);
    }

    b.appendChild(thumb);
    b.appendChild(body);
    b.addEventListener('click', function () { abrir(it); });
    return b;
  }

  // ───────────────────────── Flujo de aporte ─────────────────────────

  function pasos(activo) {
    ['monto', 'transferir', 'declarar', 'gracias'].forEach(function (p) {
      $('#step-' + p).hidden = (p !== activo);
    });
    $('#sheet').querySelector('.sheet__panel').scrollTop = 0;
  }

  function abrir(it) {
    estado.item = it;
    estado.monto = 0;

    $('#sheetEmoji').textContent = it.emoji || '🎁';
    $('#sheetTitle').textContent = it.titulo;
    $('#sheetDesc').textContent = it.descripcion;

    var prog = $('#sheetProgress');
    if (it.precio > 0) {
      var pct = Math.min(100, Math.round((it.recaudado / it.precio) * 100));
      prog.innerHTML =
        '<div class="bar"><div class="bar__fill" style="width:' + pct + '%"></div></div>' +
        '<p class="meta"><strong>' + pesos(it.recaudado) + '</strong> de ' + pesos(it.precio) + '</p>';
      prog.hidden = false;
    } else {
      prog.innerHTML = '';
      prog.hidden = true;
    }

    construirChips(it);
    $('#montoInput').value = '';
    actualizarHint();

    $('#sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    pasos('monto');
  }

  function cerrar() {
    $('#sheet').hidden = true;
    document.body.style.overflow = '';
  }

  /** Atajos de monto: fracciones de lo que falta, más el total si es alcanzable. */
  function construirChips(it) {
    var cont = $('#montoChips');
    cont.innerHTML = '';

    var opciones;
    if (it.precio > 0 && it.restante > 0) {
      var r = it.restante;
      opciones = [
        { etiqueta: 'Un cuarto', valor: redondear(r / 4) },
        { etiqueta: 'La mitad', valor: redondear(r / 2) },
        { etiqueta: 'Todo lo que falta', valor: r }
      ].filter(function (o, i, arr) {
        // Sin duplicados y sin montos por debajo del mínimo.
        if (o.valor < minimo()) return false;
        for (var k = 0; k < i; k++) if (arr[k].valor === o.valor) return false;
        return true;
      });
    } else {
      opciones = [
        { etiqueta: pesos(20000), valor: 20000 },
        { etiqueta: pesos(50000), valor: 50000 },
        { etiqueta: pesos(100000), valor: 100000 }
      ];
    }

    opciones.forEach(function (o) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'chip';
      c.textContent = o.etiqueta + (o.etiqueta.charAt(0) === '$' ? '' : ' · ' + pesos(o.valor));
      c.addEventListener('click', function () {
        $('#montoInput').value = Number(o.valor).toLocaleString('es-AR');
        marcarChip(c);
        actualizarHint();
      });
      cont.appendChild(c);
    });
  }

  function marcarChip(el) {
    $('#montoChips').querySelectorAll('.chip').forEach(function (c) { c.classList.remove('chip--on'); });
    if (el) el.classList.add('chip--on');
  }

  function redondear(n) {
    // A múltiplos de mil: los montos redondos se copian y se tipean mejor.
    return Math.max(1000, Math.round(n / 1000) * 1000);
  }

  function minimo() {
    return Number(estado.config.monto_minimo) || 1000;
  }

  function leerMonto() {
    var raw = $('#montoInput').value.replace(/[^\d]/g, '');
    return Number(raw) || 0;
  }

  function actualizarHint() {
    var m = leerMonto();
    var h = $('#montoHint');
    var btn = $('#btnAMonto');

    if (m === 0) {
      h.textContent = 'Mínimo ' + pesos(minimo()) + '.';
      btn.disabled = true;
    } else if (m < minimo()) {
      h.textContent = 'El mínimo es ' + pesos(minimo()) + '.';
      btn.disabled = true;
    } else {
      var it = estado.item;
      if (it && it.precio > 0 && it.restante > 0 && m > it.restante) {
        h.textContent = 'Para completar este regalo faltan ' + pesos(it.restante) +
                        '. Si ponés más, lo usamos en el resto del viaje.';
      } else {
        h.textContent = 'Vas a transferir ' + pesos(m) + '.';
      }
      btn.disabled = false;
    }
  }

  function irATransferir() {
    var m = leerMonto();
    if (m < minimo()) return;
    estado.monto = m;

    var c = estado.config;
    $('#transTitulo').textContent = estado.item.titulo;
    $('#transMonto').textContent = pesos(m);
    $('#dAlias').textContent = c.alias || '—';
    $('#dCbu').textContent = c.cbu || '—';
    $('#dMonto').textContent = pesos(m);
    $('#dTitular').textContent = c.titular || '—';
    $('#dBanco').textContent = c.banco || '—';

    // Verificado en iPhone (spike 2026-08-10): de todos los esquemas probados,
    // send_money es el unico que cae directo en la pantalla de transferir en vez
    // del inicio de la app. Los parametros de destino/monto siguen sin confirmarse.
    $('#btnMP').href = 'mercadopago://send_money';

    pasos('transferir');
  }

  function enviar() {
    var nombre = $('#inNombre').value.trim();
    var err = $('#declError');

    if (!nombre) {
      err.textContent = 'Necesitamos tu nombre para saber de quién vino el regalo.';
      err.hidden = false;
      $('#inNombre').focus();
      return;
    }
    err.hidden = true;

    var btn = $('#btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    var payload = {
      action: 'aporte',
      token: cfg.API_TOKEN || '',
      id_item: estado.item.id,
      nombre: nombre,
      monto: estado.monto,
      mensaje: $('#inMensaje').value.trim(),
      contacto: $('#inContacto').value.trim(),
      website: $('#website').value
    };

    if (estado.demo) {
      setTimeout(function () { gracias(nombre); restaurarBoton(btn); }, 500);
      return;
    }

    // text/plain evita el preflight CORS, que Apps Script no responde bien.
    fetch(cfg.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'Error al guardar');
        gracias(nombre);
      })
      .catch(function (e) {
        console.error(e);
        err.textContent = 'No pudimos registrarlo. Probá de nuevo, y si sigue fallando avisale a Igna: la transferencia igual llegó.';
        err.hidden = false;
      })
      .finally(function () { restaurarBoton(btn); });
  }

  function restaurarBoton(btn) {
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }

  function gracias(nombre) {
    // Nombre completo, no el primero: mucha gente carga "Familia Pérez"
    // y "Familia, anotamos tu regalo" queda raro.
    $('#graciasTexto').textContent =
      nombre + ', anotamos tu regalo: ' + estado.item.titulo + ' · ' + pesos(estado.monto) + '.';
    pasos('gracias');
    $('#inNombre').value = '';
    $('#inMensaje').value = '';
    $('#inContacto').value = '';
  }

  // ───────────────────────── Eventos ─────────────────────────

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) cerrar();

    var copy = e.target.closest('[data-copy]');
    if (copy) {
      var qué = copy.getAttribute('data-copy');
      if (qué === 'alias') copiar(estado.config.alias || '', 'Alias');
      if (qué === 'cbu') copiar(estado.config.cbu || '', 'CBU');
      if (qué === 'monto') copiar(String(estado.monto), 'Importe');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#sheet').hidden) cerrar();
  });

  $('#montoInput').addEventListener('input', function () {
    var n = leerMonto();
    this.value = n ? n.toLocaleString('es-AR') : '';
    marcarChip(null);
    actualizarHint();
  });

  // Lo mas cerca que se puede estar de "un toque y listo": copiamos el alias
  // en el mismo gesto que abre la app, asi al llegar a Mercado Pago solo queda
  // pegar. Precargar el destino y el monto no es posible sin un instrumento de
  // cobro con comision. Ver spike.html y la seccion 5 del PRD.
  $('#btnMP').addEventListener('click', function () {
    copiar(estado.config.alias || '', 'Alias');
  });

  $('#btnAMonto').addEventListener('click', irATransferir);
  $('#btnVolver').addEventListener('click', function () { pasos('monto'); });
  $('#btnYaTransferi').addEventListener('click', function () { pasos('declarar'); });
  $('#btnVolver2').addEventListener('click', function () { pasos('transferir'); });
  $('#btnEnviar').addEventListener('click', enviar);

  cargar();
})();
