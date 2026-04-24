import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getTagIconSvg } from '../utils/tag-icons';

interface Book {
  id: string;
  title: string;
  author: string | null;
  illustrator: string | null;
  authorConnection: string[];
  illustratorConnection: string[];
  coverImage: string | null;
  bookType: string | null;
  ageGroups: string[];
  representationTypes: string[];
  equipment: string[];
  mainCharacter: boolean;
  carnegieLibraryLink: string | null;
  series: string | null;
  seriesNumber: number | null;
  tags: string[];
  publicationYear: number | null;
  purchaseLink: string | null;
  landingPage: boolean;
  summary: string | null;
  languages: string[];
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

function getAgeIndex(book: { ageGroups: string[] }): number {
  let min = AGE_GROUP_ORDER.length;
  for (const g of book.ageGroups) {
    const i = AGE_GROUP_ORDER.indexOf(g);
    if (i !== -1 && i < min) min = i;
  }
  return min;
}

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
  const [tagFilter, setTagFilter] = useState(params.tag ?? '');
  const [langFilter, setLangFilter] = useState(params.lang ?? '');
  const [sortBy, setSortBy] = useState(params.sort ?? 'author');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Reveal the catalog now that React has hydrated with the correct filter state.
  // The SSR HTML shows the full unfiltered catalog; a blocking <script> in <head>
  // hides it via .catalog-loading when URL has query params.
  useEffect(() => {
    document.documentElement.classList.remove('catalog-loading');
  }, []);

  // Base filter: applies search + all filters except the one being computed
  const baseFilter = useCallback((exclude: string) => {
    const q = search.toLowerCase();
    return books.filter(b => {
      if (q && !b.title.toLowerCase().includes(q) && !(b.author?.toLowerCase().includes(q))) return false;
      if (exclude !== 'type' && bookType && b.bookType !== bookType) return false;
      if (exclude !== 'age' && ageGroup && !b.ageGroups.includes(ageGroup)) return false;
      if (exclude !== 'rep' && representation && !b.representationTypes.includes(representation)) return false;
      if (exclude !== 'equip' && equipmentFilter && !b.equipment.includes(equipmentFilter)) return false;
      if (exclude !== 'author' && authorConn && !b.authorConnection.includes(authorConn)) return false;
      if (exclude !== 'tag' && tagFilter && !b.tags.includes(tagFilter)) return false;
      if (exclude !== 'lang' && langFilter && !b.languages.includes(langFilter)) return false;
      return true;
    });
  }, [books, search, bookType, ageGroup, representation, equipmentFilter, authorConn, tagFilter, langFilter]);

  // Derive filter options dynamically — each dropdown only shows values compatible with the other active filters
  // Also compute counts: how many books match each option value
  function countBy(items: Book[], accessor: (b: Book) => (string | null | undefined)[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const b of items) {
      for (const v of accessor(b)) {
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return counts;
  }

  const typeBase = useMemo(() => baseFilter('type'), [baseFilter]);
  const bookTypes = useMemo(() => unique(typeBase.map(b => b.bookType)), [typeBase]);
  const bookTypeCounts = useMemo(() => countBy(typeBase, b => [b.bookType]), [typeBase]);

  const ageBase = useMemo(() => baseFilter('age'), [baseFilter]);
  const ageGroupsAvail = useMemo(() => {
    const present = new Set(ageBase.flatMap(b => b.ageGroups));
    return AGE_GROUP_ORDER.filter(g => present.has(g));
  }, [ageBase]);
  const ageGroupCounts = useMemo(() => countBy(ageBase, b => b.ageGroups), [ageBase]);

  const repBase = useMemo(() => baseFilter('rep'), [baseFilter]);
  const representations = useMemo(() => unique(repBase.flatMap(b => b.representationTypes)), [repBase]);
  const repCounts = useMemo(() => countBy(repBase, b => b.representationTypes), [repBase]);

  const equipBase = useMemo(() => baseFilter('equip'), [baseFilter]);
  const equipmentOptions = useMemo(() => unique(equipBase.flatMap(b => b.equipment)), [equipBase]);
  const equipCounts = useMemo(() => countBy(equipBase, b => b.equipment), [equipBase]);

  const authorBase = useMemo(() => baseFilter('author'), [baseFilter]);
  const authorConnections = useMemo(() => unique(authorBase.flatMap(b => b.authorConnection)), [authorBase]);
  const authorCounts = useMemo(() => countBy(authorBase, b => b.authorConnection), [authorBase]);

  const tagBase = useMemo(() => baseFilter('tag'), [baseFilter]);
  const tagsAvail = useMemo(() => unique(tagBase.flatMap(b => b.tags)), [tagBase]);
  const tagCounts = useMemo(() => countBy(tagBase, b => b.tags), [tagBase]);

  const langBase = useMemo(() => baseFilter('lang'), [baseFilter]);
  const langsAvail = useMemo(() => unique(langBase.flatMap(b => b.languages)), [langBase]);
  const langCounts = useMemo(() => countBy(langBase, b => b.languages), [langBase]);

  // Auto-clear a filter if its selected value is no longer among the available options
  useEffect(() => {
    if (bookType && !bookTypes.includes(bookType)) setBookType('');
  }, [bookType, bookTypes]);
  useEffect(() => {
    if (ageGroup && !ageGroupsAvail.includes(ageGroup)) setAgeGroup('');
  }, [ageGroup, ageGroupsAvail]);
  useEffect(() => {
    if (representation && !representations.includes(representation)) setRepresentation('');
  }, [representation, representations]);
  useEffect(() => {
    if (equipmentFilter && !equipmentOptions.includes(equipmentFilter)) setEquipmentFilter('');
  }, [equipmentFilter, equipmentOptions]);
  useEffect(() => {
    if (authorConn && !authorConnections.includes(authorConn)) setAuthorConn('');
  }, [authorConn, authorConnections]);
  useEffect(() => {
    if (tagFilter && !tagsAvail.includes(tagFilter)) setTagFilter('');
  }, [tagFilter, tagsAvail]);
  useEffect(() => {
    if (langFilter && !langsAvail.includes(langFilter)) setLangFilter('');
  }, [langFilter, langsAvail]);

  // Sync filters to URL
  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (bookType) p.set('type', bookType);
    if (ageGroup) p.set('age', ageGroup);
    if (representation) p.set('rep', representation);
    if (equipmentFilter) p.set('equip', equipmentFilter);
    if (authorConn) p.set('author', authorConn);
    if (tagFilter) p.set('tag', tagFilter);
    if (langFilter) p.set('lang', langFilter);
    if (sortBy !== 'author') p.set('sort', sortBy);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
    sessionStorage.setItem('catalogQuery', qs);
  }, [search, bookType, ageGroup, representation, equipmentFilter, authorConn, tagFilter, langFilter, sortBy]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  // Reset visible count when filters change
  useEffect(() => { setVisible(PAGE_SIZE); }, [search, bookType, ageGroup, representation, equipmentFilter, authorConn, tagFilter, langFilter]);

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
      if (tagFilter && !b.tags.includes(tagFilter)) return false;
      if (langFilter && !b.languages.includes(langFilter)) return false;
      return true;
    });
  }, [books, search, bookType, ageGroup, representation, equipmentFilter, authorConn, tagFilter, langFilter]);

  // Sort — books with covers are shown first, then by the chosen sort order
  const sorted = useMemo(() => {
    const list = [...filtered];
    const compare = (a: any, b: any) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'year':
          return (b.publicationYear ?? 0) - (a.publicationYear ?? 0);
        case 'year-asc':
          return (a.publicationYear ?? 0) - (b.publicationYear ?? 0);
        case 'age':
        case 'age-desc': {
          const ai = getAgeIndex(a);
          const bi = getAgeIndex(b);
          const aNoAge = ai === AGE_GROUP_ORDER.length ? 1 : 0;
          const bNoAge = bi === AGE_GROUP_ORDER.length ? 1 : 0;
          if (aNoAge !== bNoAge) return aNoAge - bNoAge;
          return sortBy === 'age' ? ai - bi : bi - ai;
        }
        case 'author-desc':
          return getLastName(b.author).localeCompare(getLastName(a.author));
        case 'author':
        default:
          return getLastName(a.author).localeCompare(getLastName(b.author));
      }
    };
    return list.sort((a, b) => {
      const aCover = a.coverImage ? 0 : 1;
      const bCover = b.coverImage ? 0 : 1;
      if (aCover !== bCover) return aCover - bCover;
      return compare(a, b);
    });
  }, [filtered, sortBy]);

  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  // Infinite scroll: load more when sentinel enters viewport
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
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
  }, [visible, hasMore]);

  const hasActiveFilters = search || bookType || ageGroup || representation || equipmentFilter || authorConn || tagFilter || langFilter;

  function clearFilters() {
    setSearch('');
    setBookType('');
    setAgeGroup('');
    setRepresentation('');
    setEquipmentFilter('');
    setAuthorConn('');
    setTagFilter('');
    setLangFilter('');
  }

  return (
    <div className="catalog">
      <div className="controls" role="search" aria-label="Filter books">
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
            {bookTypes.map(t => <option key={t} value={t}>{t} ({bookTypeCounts.get(t) ?? 0})</option>)}
          </select>
          <select aria-label="Filter by age group" value={ageGroup} onChange={e => setAgeGroup(e.target.value)}>
            <option value="">All ages</option>
            {ageGroupsAvail.map(a => <option key={a} value={a}>{a} ({ageGroupCounts.get(a) ?? 0})</option>)}
          </select>
          <select aria-label="Filter by representation" value={representation} onChange={e => setRepresentation(e.target.value)}>
            <option value="">All representation</option>
            {representations.map(r => <option key={r} value={r}>{r} ({repCounts.get(r) ?? 0})</option>)}
          </select>
          {equipmentOptions.length > 0 && (
            <select aria-label="Filter by equipment" value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}>
              <option value="">All equipment</option>
              {equipmentOptions.map(eq => <option key={eq} value={eq}>{eq} ({equipCounts.get(eq) ?? 0})</option>)}
            </select>
          )}
          <select aria-label="Filter by author connection" value={authorConn} onChange={e => setAuthorConn(e.target.value)}>
            <option value="">Any author</option>
            {authorConnections.map(s => <option key={s} value={s}>{s} ({authorCounts.get(s) ?? 0})</option>)}
          </select>
          {tagsAvail.length > 0 && (
            <select aria-label="Filter by topic" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
              <option value="">All topics</option>
              {tagsAvail.map(t => <option key={t} value={t}>{t} ({tagCounts.get(t) ?? 0})</option>)}
            </select>
          )}
          {langsAvail.length > 0 && (
            <select aria-label="Filter by language" value={langFilter} onChange={e => setLangFilter(e.target.value)}>
              <option value="">All languages</option>
              {langsAvail.map(l => <option key={l} value={l}>{l} ({langCounts.get(l) ?? 0})</option>)}
            </select>
          )}
          <select aria-label="Sort order" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="author">Sort: Author A–Z</option>
            <option value="author-desc">Sort: Author Z–A</option>
            <option value="title">Sort: Title A–Z</option>
            <option value="title-desc">Sort: Title Z–A</option>
            <option value="age">Sort: Age (youngest)</option>
            <option value="age-desc">Sort: Age (oldest)</option>
            <option value="year">Sort: Year (newest)</option>
            <option value="year-asc">Sort: Year (oldest)</option>
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
              {book.illustrator && book.illustrator !== book.author && (
                <p className="card-author">Illustrated by {book.illustrator}</p>
              )}
              <div className="card-meta">
                {book.ageGroups.length > 0 && <span>{book.ageGroups.join(' / ')}</span>}
                {book.ageGroups.length > 0 && book.bookType && <span className="dot">&middot;</span>}
                {book.bookType && <span>{book.bookType}</span>}
              </div>
              <div className="card-tags">
                {book.mainCharacter && (
                  <span className="tag tag-main">★ Main Character</span>
                )}
                {book.representationTypes.map(tag => (
                  <span key={tag} className="tag">
                    {getTagIconSvg(tag) && <span className="tag-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: getTagIconSvg(tag) }} />}
                    {tag}
                  </span>
                ))}
                {book.equipment.map(tag => (
                  <span key={tag} className="tag tag-equip">
                    {getTagIconSvg(tag) && <span className="tag-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: getTagIconSvg(tag) }} />}
                    {tag}
                  </span>
                ))}
                {book.tags.map(tag => (
                  <span key={tag} className="tag tag-topic">{tag}</span>
                ))}
                {book.authorConnection.length > 0 && (
                  <span className="tag tag-author">{book.authorConnection.join(', ')} Author</span>
                )}
                {book.illustratorConnection.length > 0 && (
                  <span className="tag tag-author">{book.illustratorConnection.join(', ')} Illustrator</span>
                )}
                {book.languages.map(lang => (
                  <span key={lang} className="tag tag-lang">{lang}</span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>

      {hasMore && (
        <>
          <div ref={sentinelRef} className="load-more-sentinel" style={{ height: '1px' }} />
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
