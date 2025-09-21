import { useState, useCallback } from 'react';
import { SearchResult, searchContent } from '../../util/search';

interface UseSearchProps {
  onSearchComplete?: (results: SearchResult[]) => void;
  onSearchClear?: () => void;
}

interface UseSearchReturn {
  query: string;
  results: SearchResult[];
  isOpen: boolean;
  setQuery: (query: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  handleSearch: (e: React.FormEvent) => void;
  handleQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
}

export function useSearch({ onSearchComplete, onSearchClear }: UseSearchProps = {}): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const performSearch = useCallback((searchQuery: string) => {
    if (searchQuery) {
      const searchResults = searchContent(searchQuery);
      setResults(searchResults);
      setIsOpen(true);
      onSearchComplete?.(searchResults);
    } else {
      setResults([]);
      setIsOpen(false);
      onSearchClear?.();
    }
  }, [onSearchComplete, onSearchClear]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    performSearch(newQuery);
  }, [performSearch]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      performSearch(query);
    }
  }, [query, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSearchClear?.();
  }, [onSearchClear]);

  return {
    query,
    results,
    isOpen,
    setQuery,
    setIsOpen,
    handleSearch,
    handleQueryChange,
    clearSearch
  };
}

export function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const index = normalizedText.indexOf(normalizedQuery);
  
  if (index === -1) return text;
  
  return text.slice(0, index) +
    `<mark class="bg-yellow-200">${text.slice(index, index + query.length)}</mark>` +
    text.slice(index + query.length);
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
} 