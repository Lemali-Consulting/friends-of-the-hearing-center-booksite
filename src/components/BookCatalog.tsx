import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

interface Book {
  id: string;
  title: string;
  author: string | null;
  illustrator: string | null;
  authorInfo: string | null;
  authorConnection: string[];
  coverImage: string | null;
  bookType: string | null;
  ageRange: string | null;
  ageGroups: string[];
  representationTypes: string[];
  equipment: string[];
  mainCharacter: boolean;
  libraryAvailable: boolean | null;
  publicationYear: number | null;
}

interface Props {
  books: Book[];
  base: string;
}

const PAGE_SIZE = 48;

// Fixed order for age group dropdown
const AGE_GROUP_ORDER = [
  'Baby & Toddler',
  'Ages 3-5',
  'Ages 6-8',
  'Ages 9-12',
  'Teen',
  'Adult',
];

function getLastName(author: string | null): string {
  if (!author) return '\uffff';
  const primary = author.split(/[,&]/)[0].trim();
  const parts = primary.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function unique(arr: (string | null | undefined)[]): string[] {
  return [...new Set(arr.filter((v): v is string => Boolean(v)))].sort();
}

function readParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params: Record<string, string> = {};
  new URLSearchParams(window.location.search).forEach((v, k) => {
    params[k] = v;
  });
  return params;
}

export default function BookCatalog({ books, base }: Props) {
  const params = readParams();

  const [search, setSearch] = useState(params.q ?? '');
  const [bookType, setBookType] = useState(params.type ?? '');
  const [ageGroup, setAgeGroup] = useState(params.age ?? '');
  const [representation, setRepresentation] = useState(params.rep ?? '');
  const [equipmentFilter, setEquipmentFilter] = useState(params.equip ?? '');
  const [authorConn, setAuthorConn] = useState(params.author ?? '');
  const [sortBy, setSortBy] = useState(params.sort ?? 'author');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Derive filter options from data
  const bookTypes = useMemo(() => unique(books.map(b => b.bookType)), [books]);
  const ageGroupsAvail = useMemo(() => {
    const present = new Set(books.flatMap(b => b.ageGroups));
    return AGE_GROUP_ORDER.filter(g => present.has(g));
  }, [books]);
  const representations = useMemo(() => unique(books.flatMap(b => b.representationTypes)), [books]);
  const equipmentOptions = useMemo(() => unique(books.flatMap(b => b.equipment)), [books]);
  const authorConnections = useMemo(() => unique(books.flatMap(b => b.authorConnection)), [books]);

  // Sync filters to URL
  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (bookType) p.set('type', bookType);
    if (ageGroup) p.set('age', ageGroup);
    if (representation) p.set('rep', representation);
    if (equipmentFilter) p.set('equip', equipmentFilter);
    if (authorConn) p.set('author', authorConn);
    if (sortBy !== 'author') p.set('sort', sortBy);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [search, bookType, ageGroup, representation, equipmentFilter, authorConn, sortBy]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  // Reset visible count when filters change
  useEffect(() => { setVisible(PAGE_SIZE); }, [search, bookType, ageGroup, representation, equipmentFilter, authorConn]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return books.filter(b => {
      if (q && !b.title.toLowerCase().includes(q) && !(b.author?.toLowerCase().includes(q))) return false;
      if (bookType && b.bookType !== bookType) return false;
      if (ageGroup && !b.ageGroups.includes(ageGroup)) return false;
      if (representation && !b.representationTypes.includes(representation)) return false;
      if (equipmentFilter && !b.equipment.includes(equipmentFilter)) return false;
      if (authorConn && !b.authorConnection.includes(authorConn)) return false;
      return true;
    });
  }, [books, search, bookType, ageGroup, representation, equipmentFilter, authorConn]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'title':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'year':
        return list.sort((a, b) => (b.publicationYear ?? 0) - (a.publicationYear ?? 0));
      case 'author':
      default:
        return list.sort((a, b) => getLastName(a.author).localeCompare(getLastName(b.author)));
    }
  }, [filtered, sortBy]);

  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  // Infinite scroll: load more when sentinel enters viewport
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(v => v + PAGE_SIZE);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sorted.length]);

  const hasActiveFilters = search || bookType || ageGroup || representation || equipmentFilter || authorConn;

  function clearFilters() {
    setSearch('');
    setBookType('');
    setAgeGroup('');
    setRepresentation('');
    setEquipmentFilter('');
    setAuthorConn('');
  }

  return (
    <div className="catalog">
      <div className="controls">
        <label htmlFor="book-search" className="sr-only">Search by title or author</label>
        <input
          id="book-search"
          type="search"
          className="search-input"
          placeholder="Search by title or author..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filters">
          <select aria-label="Filter by book type" value={bookType} onChange={e => setBookType(e.target.value)}>
            <option value="">All types</option>
            {bookTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select aria-label="Filter by age group" value={ageGroup} onChange={e => setAgeGroup(e.target.value)}>
            <option value="">All ages</option>
            {ageGroupsAvail.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select aria-label="Filter by representation" value={representation} onChange={e => setRepresentation(e.target.value)}>
            <option value="">All representation</option>
            {representations.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {equipmentOptions.length > 0 && (
            <select aria-label="Filter by equipment" value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}>
              <option value="">All equipment</option>
              {equipmentOptions.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          )}
          <select aria-label="Filter by author connection" value={authorConn} onChange={e => setAuthorConn(e.target.value)}>
            <option value="">Any author</option>
            {authorConnections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Sort order" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="author">Sort: Author</option>
            <option value="title">Sort: Title</option>
            <option value="year">Sort: Year (newest)</option>
          </select>
        </div>
        {hasActiveFilters && (
          <button className="clear-btn" onClick={clearFilters} type="button">
            Clear filters
          </button>
        )}
      </div>

      <p className="result-count" role="status" aria-live="polite">
        {filtered.length === books.length
          ? `${books.length} books`
          : `${filtered.length} of ${books.length} books`}
      </p>

      <div className="book-grid">
        {shown.map(book => (
          <a key={book.id} href={`${base}/books/${book.id}`} className="book-card">
            <div className="cover">
              {book.coverImage
                ? <img src={book.coverImage} alt={`Cover of ${book.title}`} loading="lazy" />
                : <div className="cover-placeholder" aria-hidden="true">{book.title[0]}</div>
              }
            </div>
            <div className="info">
              <h2 className="card-title">{book.title}</h2>
              <p className="card-author">{book.author}</p>
              <div className="card-meta">
                {book.ageRange && <span>{book.ageRange}</span>}
                {book.ageRange && book.bookType && <span className="dot">&middot;</span>}
                {book.bookType && <span>{book.bookType}</span>}
              </div>
              <div className="card-tags">
                {book.representationTypes.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
                {book.equipment.map(tag => (
                  <span key={tag} className="tag tag-equip">{tag}</span>
                ))}
                {book.authorConnection.length > 0 && (
                  <span className="tag tag-author">{book.authorConnection.join(', ')} Author</span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>

      {hasMore && (
        <>
          <div ref={sentinelRef} className="load-more-sentinel" />
          <div className="load-more">
            <button type="button" onClick={() => setVisible(v => v + PAGE_SIZE)}>
              Show more books
            </button>
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <p className="no-results">No books match your filters. Try broadening your search.</p>
      )}
    </div>
  );
}
