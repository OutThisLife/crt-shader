import { useEffect, useMemo, useRef, useState } from 'react';
import { CRTRenderer, resolveSettings } from 'crt-shader';
import inventory from '../../examples/gallery-inventory.json';
import { loadImage, outputSize, prepareGalleryInput } from './gallery-input.js';
import { captureGalleryMedia, InspectableSurface, InspectHint } from './GalleryViewer.jsx';

function Comparison({ row }) {
  const element = useRef(null);
  const before = useRef(null);
  const output = useRef(null);
  const reference = useRef(null);
  const title = row.reference ? 'Peach' : row.title;
  const { width, height } = outputSize(row);
  const capture = canvas => {
    if (element.current.dataset.rendered !== 'true') {
      throw new Error(element.current.dataset.error ? 'This preview could not be rendered.' : 'This preview is still loading. Try again in a moment.');
    }
    return captureGalleryMedia(canvas.current);
  };
  return <section ref={element} className="crt-comparison" data-example={row.id}>
    <h3>{title}</h3>
    <div className={`crt-panels${row.reference ? ' crt-panels-reference' : ''}`}>
      <figure>
        <figcaption>{row.reference ? 'Article pixels' : row.photo ? 'Original photograph' : 'Source pixels'}</figcaption>
        <InspectableSurface label={`${title}: source image`} capture={() => capture(before)} style={{ aspectRatio: `${width} / ${height}` }}>
          <canvas ref={before} data-before width={width} height={height} aria-label={`${row.title}: source image`} />
        </InspectableSurface>
      </figure>
      {row.reference && <figure>
        <figcaption>CRT photograph</figcaption>
        <InspectableSurface label="Peach: CRT photograph" capture={() => captureGalleryMedia(reference.current)} style={{ aspectRatio: `${width} / ${height}` }}>
          <img ref={reference} src={row.articleReference.path} width={width} height={height} alt="Peach on a CRT display" />
        </InspectableSurface>
      </figure>}
      <figure>
        <figcaption>crt-shader · Reference</figcaption>
        <InspectableSurface label={`${title}: CRT output`} capture={() => capture(output)} style={{ aspectRatio: `${width} / ${height}` }}>
          <canvas ref={output} data-output width={width} height={height} aria-label={`${row.title}: live CRT shader reconstruction`} />
        </InspectableSurface>
      </figure>
    </div>
    <p className="crt-caption">
      {row.nativeDimensions.join(' × ')} input · {width} × {height} output
      {' · '}<a href={row.article?.url || row.source.url || row.sourceURLs[0] || '/CREDITS/'}>Source</a>
      {row.license.identifier === 'CC0-1.0' && ' · CC0 artwork'}
    </p>
    {(row.limitations.length > 0 || row.articleReference) && <details>
      <summary>Image notes</summary>
      {row.reference && <p>
        Input: <a href={row.source.url}>Peach sprite</a> from the follow-up article.
        Its palette differs from the earlier image.
        Photograph credit: <a href={row.articleReference.originalPostURL}>CRTpixels</a>,
        reproduced by <a href={row.articleReference.articleURL}>Datagubbe</a>.
      </p>}
      {row.articleReference && !row.reference && <figure>
        <InspectableSurface label={`${row.title}: article comparison`} capture={() => captureGalleryMedia(reference.current)}>
          <img ref={reference} src={row.articleReference.path} loading="lazy" alt={`${row.title}: article comparison`} />
        </InspectableSurface>
        <figcaption>Article comparison, with different framing</figcaption>
      </figure>}
      <ul>{row.limitations.map(note => <li key={note}>{note}</li>)}</ul>
      <p>{row.license.notice}</p>
    </details>}
    <p className="crt-row-error" role="alert" hidden />
  </section>;
}

export default function ComparisonGallery({ only }) {
  const root = useRef(null);
  const rows = useMemo(() => only ? inventory.rows.filter(row => row.id === only) : inventory.rows, [only]);
  const [columns, setColumns] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let renderer;
    let alive = true;
    try { renderer = new CRTRenderer({ cacheBytes: 0 }); }
    catch (failure) { setError(failure.message); return; }
    const settings = resolveSettings('reference');
    const elements = [...root.current.querySelectorAll('[data-example]')];
    const byId = new Map(rows.map(row => [row.id, row]));

    async function render(element) {
      const row = byId.get(element.dataset.example);
      try {
        const { source, original } = await prepareGalleryInput(row);
        const article = row.reference ? await loadImage(row.article.imagePath) : null;
        if (!alive) return;
        const before = element.querySelector('[data-before]');
        const output = element.querySelector('[data-output]');
        const { width, height } = outputSize(row);
        if (row.reference) {
          before.width = row.articleReference.parentCrop[0];
          before.height = row.articleReference.dimensions[1];
          before.getContext('2d').drawImage(article, 0, 0, before.width, before.height, 0, 0, before.width, before.height);
        } else {
          before.width = row.photo ? width : source.width;
          before.height = row.photo ? height : source.height;
          const context = before.getContext('2d');
          context.imageSmoothingEnabled = row.photo;
          context.drawImage(row.photo ? original : source, 0, 0, before.width, before.height);
          if (!row.photo) before.style.imageRendering = 'pixelated';
        }
        renderer.render(source, output, settings, {
          width, height, view: row.reconstruction.view, sourceVersion: 0,
        });
        element.dataset.rendered = 'true';
        element.dataset.inputSize = `${source.width}x${source.height}`;
      } catch (failure) {
        if (!alive) return;
        element.dataset.error = 'true';
        const message = element.querySelector('.crt-row-error');
        message.hidden = false;
        message.textContent = `Unable to render ${row.title}: ${failure.message}`;
      }
    }

    const observer = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) if (isIntersecting) {
        observer.unobserve(target);
        void render(target);
      }
    }, { rootMargin: '500px' });
    for (const element of elements) observer.observe(element);
    return () => { alive = false; observer.disconnect(); renderer.dispose(); };
  }, [rows]);

  return <div ref={root} className="crt-gallery not-content" data-gallery-count={rows.length}>
    <div className="crt-gallery-toolbar">
      <InspectHint />
      {!only && <label>Columns <select value={columns} onChange={event => setColumns(Number(event.target.value))}>
        {[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>}
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="crt-gallery-grid" style={{ '--crt-columns': columns }}>
      {rows.map(row => <Comparison key={row.id} row={row} />)}
    </div>
  </div>;
}
