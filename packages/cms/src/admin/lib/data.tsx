import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCollections, fetchGlobals, type CollectionMeta, type GlobalMeta } from "@/lib/api";

interface DataContextValue {
  collections: CollectionMeta[];
  globals: GlobalMeta[];
  isLoadingCollections: boolean;
  isLoadingGlobals: boolean;
  collectionsError: string | null;
  globalsError: string | null;
  refreshCollections: () => Promise<void>;
  refreshGlobals: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [globals, setGlobals] = useState<GlobalMeta[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isLoadingGlobals, setIsLoadingGlobals] = useState(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [globalsError, setGlobalsError] = useState<string | null>(null);

  const loadCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const data = await fetchCollections();
      setCollections(data);
      setCollectionsError(null);
    } catch (err) {
      setCollectionsError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const loadGlobals = async () => {
    setIsLoadingGlobals(true);
    try {
      const data = await fetchGlobals();
      setGlobals(data);
      setGlobalsError(null);
    } catch (err) {
      setGlobalsError(err instanceof Error ? err.message : "Failed to load globals");
    } finally {
      setIsLoadingGlobals(false);
    }
  };

  useEffect(() => {
    loadCollections();
    loadGlobals();
  }, []);

  return (
    <DataContext.Provider
      value={{
        collections,
        globals,
        isLoadingCollections,
        isLoadingGlobals,
        collectionsError,
        globalsError,
        refreshCollections: loadCollections,
        refreshGlobals: loadGlobals,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}

export function useCollections(): {
  collections: CollectionMeta[];
  isLoading: boolean;
  error: string | null;
} {
  const { collections, isLoadingCollections, collectionsError } = useData();
  return { collections, isLoading: isLoadingCollections, error: collectionsError };
}

export function useGlobals(): {
  globals: GlobalMeta[];
  isLoading: boolean;
  error: string | null;
} {
  const { globals, isLoadingGlobals, globalsError } = useData();
  return { globals, isLoading: isLoadingGlobals, error: globalsError };
}

export function useCollection(slug: string): {
  collection: CollectionMeta | undefined;
  isLoading: boolean;
  error: string | null;
} {
  const { collections, isLoadingCollections, collectionsError } = useData();
  return {
    collection: collections.find((c) => c.slug === slug),
    isLoading: isLoadingCollections,
    error: collectionsError,
  };
}

export function useGlobal(slug: string): {
  global: GlobalMeta | undefined;
  isLoading: boolean;
  error: string | null;
} {
  const { globals, isLoadingGlobals, globalsError } = useData();
  return {
    global: globals.find((g) => g.slug === slug),
    isLoading: isLoadingGlobals,
    error: globalsError,
  };
}

export { useData };
