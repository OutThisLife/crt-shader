import { useEffect, useMemo, useRef, useState } from 'react';
import { CRTRenderer, resolveSettings } from 'crt-shader';
import inventory from '../../examples/gallery-inventory.json';
import { loadImage, outputSize, prepareGalleryInput } from './gallery-input.js';
import './gallery.css';

function Comparison({ row }) {
  const { width, height } = outputSize(row);
  return <section className="crt-comparison" data-example={row.id}>
    <h3>{row.reference ? 'From pixels to phosphor' : row.title}</h3>
    <div className={`crt-panels${row.reference ? ' crt-panels-reference' : ''}`}>
      <figure>
        <figcaption>{row.reference ? 'Article pixels' : row.photo ? 'Original photograph' : 'Source pixels'}</figcaption>
        <div className="crt-surface" style={{ aspectRatio: `${width} / ${height}` }}>
          <canvas data-before width={width} height={height} aria-label={`${row.title}: source image`} />
        </div>
      </figure>
      {row.reference && <figure>
        <figcaption>CRT photograph</figcaption>
        <div className="crt-surface" style={{ aspectRatio: `${width} / ${height}` }}>
          <img src={row.articleReference.path} width={width} height={height} alt="The CRT photograph reproduced in Datagubbe’s article" />
        </div>
      </figure>}
      <figure>
        <figcaption>crt-shader · Reference</figcaption>
        <div className="crt-surface" style={{ aspectRatio: `${width} / ${height}` }}>
          <canvas data-output width={width} height={height} aria-label={`${row.title}: live CRT shader reconstruction`} />
        </div>
      </figure>
    </div>
    <p className="crt-caption">
      {row.reference && 'Registered detail crop · '}
      {row.nativeDimensions.join(' × ')} input → {width} × {height} output
      {' · '}<a href={row.article?.url || row.source.url || row.sourceURLs[0] || '/CREDITS/'}>Source &amp; credits</a>
      {row.license.identifier === 'CC0-1.0' && ' · CC0 artwork'}
    </p>
    {row.reference && <p className="crt-caption">
      The article’s reference is a real CRT photograph, not another shader.
      Our input is the follow-up Peach sprite; its palette and a few source pixels differ.
    </p>}
    {(row.limitations.length > 0 || row.articleReference) && <details>
      <summary>Source notes{row.articleReference ? ' & reference' : ''}</summary>
      {row.reference && <p>
        The shader samples only <a href={row.source.url}>the source sprite</a>.
        The reference photograph is never used as a texture or overlay.
        Photograph credit: <a href={row.articleReference.originalPostURL}>CRTpixels</a>,
        reproduced by <a href={row.articleReference.articleURL}>Datagubbe</a>.
      </p>}
      {row.articleReference && !row.reference && <figure>
        <img src={row.articleReference.path} loading="lazy" alt={`${row.title}: the original article comparison, not registered to this rendering`} />
        <figcaption>Original article comparison · separate, unregistered reference</figcaption>
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
        const message = element.querySelector('[role="alert"]');
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
    {!only && <div className="crt-gallery-toolbar">
      <span>{rows.length} original examples · one frozen Reference preset</span>
      <label>Columns <select value={columns} onChange={event => setColumns(Number(event.target.value))}>
        {[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>}
    {error && <p role="alert">{error}</p>}
    <div className="crt-gallery-grid" style={{ '--crt-columns': columns }}>
      {rows.map(row => <Comparison key={row.id} row={row} />)}
    </div>
  </div>;
}
