# Kumbra web (post-lanzamiento) — notas para continuar

Archivo principal: `index.html` (en esta carpeta). Todo en un solo archivo (CSS + JS inline). Imágenes en `img/` (`img/photos/`, `img/avatars/`, logos). Three.js r128 desde cdnjs.

## Verla en local
`cd ~/Developer/kumbra-web && npx vercel dev` y abrir http://localhost:3000/kumbra/previa-7adf70/ (las imágenes usan rutas absolutas `/kumbra/previa-7adf70/img/...`, así que no se ven abriendo el archivo suelto). Para que salgan los fundadores reales hace falta `SUPABASE_SERVICE_ROLE_KEY` en un `.env` en la raíz (Vercel no descarga las variables sensibles; `vercel dev` lee `.env`, no `.env.local`). Ambos están en `.gitignore`.

## Marca
Night #1B1719, Cream #F3EEE6, Ink #1A1A1A. Degradado del logo: ámbar #F2B44A → naranja #F08A3C → rojo #E5484D → magenta #A7377B → violeta #533794 → ciruela #382562. Tipografías: Nunito Black (títulos) + Inter. Sin naranja plano.

## Estructura (de arriba abajo)
1. Nav único con categorías (#apunta, #sesion, #gente, #progreso, #pro, #fundadores, #preguntas). Activo calculado por scroll (`mark()`).
2. Hero: montaña 3D (Three.js) con sol, 400svh con `.pin` sticky; el logo entra en el móvil. Tres piezas flotantes (6B, +88 XP, kudos).
3. Funcionalidades (`section.feat`): cinco hojas `.sx` que se solapan (`margin-top:-100svh`), cada una con `.pin` sticky y una demo que reacciona al scroll (`renderA..renderE`):
   - A `#apunta` cuadrícula de grados + Flash/Top/Proyecto (3 pasos).
   - B `#sesion` cordillera (portada foto + `ridge()` portado de `AXSessionRidge.swift`).
   - C `#gente` feed (Rubén V., Carla F., Lucía R.) con kudos que se activan por scroll.
   - D `#progreso` tarjeta "Tu semana", anillo nivel 4 → 5 y cartel centrado.
   - E `#numeros` estadísticas por mes + pulso con puntos por bloque.
   El helper de progreso usa `st.over` (altura − 2·vh) en las hojas que otra tapa.
4. Planes `#pro` (Gratis 0 € / Pro con interruptor Mensual–Anual, ahorro −37 %), `#rocodromos`, `#fundadores` (contador + carrusel de nombres del endpoint `/api/kumbraFounders`; se oculta si no hay datos), `#preguntas` (FAQ + JSON-LD), `#descarga` (tarjeta final), footer.
5. Footer: marca + tiendas + redes, Explora, Legal, Contacto, "Volver arriba".

## Configuración (objeto `CONFIG`, arriba del script)
- `ios` / `android`: enlaces de las tiendas (ya puestos).
- `contact`: `axclimb@gmail.com` (confirmar si se quiere otro).
- `instagram` / `tiktok`: VACÍOS → los iconos del footer están ocultos hasta rellenarlos (usuario sin @).

## Pendiente antes de publicar
- Quitar `noindex`.
- Rellenar `CONFIG.instagram` y `CONFIG.tiktok`; confirmar correo de contacto.
- Confirmar precios (3,99 €/mes, 29,99 €/año → ahorro 17,89 €, 37 %) y los "7 días gratis" con App Store Connect / Google Play.
- Lista Gratis/Pro sacada del código iOS (`AXPro.swift`, límites de objetivos/retos/historial/media). Revisar contra Android.
- Eliminar cuenta: en la web solo hay mailto + "Ajustes → Eliminar cuenta"; Google Play suele pedir una URL (existe la carpeta `kumbra-delete-account`, revisar que sea la de Kumbra).
- Fotos de escalada (`img/photos/p*.webp`): confirmar permisos de uso de las personas que salen.
- Decidir si esta web sustituye a la de la lista de espera (de momento va en la rama `feature/web-lanzamiento`).
- Rocódromos: decidir qué colaboración se ofrece (idea: plano del rocódromo + datos agregados y anónimos de quien escala allí). Decidir si se quitan las etiquetas «Ranking semanal» / «En directo» de las fotos.
- Comprobar en un móvil real el scroll táctil de las hojas (en simulación a 375 px, 1440 px y 1920 px se ve bien y sin scroll lateral).

## Cambios del 5 nov
- Hero: «La red social de la escalada» ya se apaga con el scroll (la animación de entrada la dejaba fija); la tarjeta de kudos de Marta pasa a la derecha, bajo «cuenta.».
- «Tus números»: la demo empieza a animarse mientras la hoja entra, y las cifras del pulso no se ven hasta que empiezan a contar (sin ceros).
- Borrado el código muerto: `.btn.orange`, `--orange`, CSS de la tarjeta flotante «Tu sesión» y su script `data-range`, `.names`, `.sc` y selectores sin uso en reduced-motion.
- Barra: enlaces centrados en la barra (rejilla de 3 columnas desde 680 px); arriba del todo ya no se marca ninguna sección; «Fundadores» solo sale si hay datos.
- Contorno de foco del teclado en ámbar de la marca (antes lima).
- Lema: «La red social de escalada» (sin «la»).
- Planes: 5 puntos por plan, textos más cortos, sin tarjetas inclinadas ni solapadas (la tarjeta Pro se llama `plus`, porque `pro` es la sección y heredaba sus estilos), y animación con el scroll: las tarjetas suben y se enderezan, los puntos aparecen uno a uno, el precio cuenta y el cambio Mensual/Anual también cuenta.
- Rocódromos: «¿Llevas un rocódromo? Ya estás en Kumbra.» con botón «Hablemos» (correo); en móvil, título → fotos → texto y botón.
- «Sube con los tuyos»: el degradado ocupa toda la sección, sin marco negro.
- Preguntas: el «+» se dibuja con dos barras para que quede centrado.
- Hero: la tarjeta de kudos de Marta solo en escritorio (en móvil competía con las tiendas).

## Reglas del repo (CLAUDE.md)
Comentarios en inglés; no hacer commit sin un "sí" explícito; en iOS los comandos git los ejecuta la usuaria. Nada de esto está commiteado todavía.
