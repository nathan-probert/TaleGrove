'use client';

import { useEffect, useState } from 'react';
import BookList from '@/components/dashboard/BookList';
import { BookOrFolder, Folder } from '@/types';
import { fetchUserBooksAndFolders } from '@/lib/getBooks';
import supabase, { createFolder, getRootId, deleteFolder } from '@/lib/supabase'; // Import deleteFolder
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react'; // Import Trash2 icon


export default function Books() {
    const params = useParams();
    const slugArray = Array.isArray(params.slug) ? params.slug : params.slug ? [params.slug] : [];

    const [books, setBooks] = useState<BookOrFolder[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isDeleting, setIsDeleting] = useState<boolean>(false); // State for delete operation
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string, slug: string | null }[]>([
        { id: null, name: 'Home', slug: null }
    ]);
    const [isRoot, setIsRoot] = useState<boolean>(false);
    const [parentFolderId, setParentFolderId] = useState<string | null>(null);


    const router = useRouter();

    const resolveFolderPath = async (userId: string, slugPath: string[]) => {
        let parentId: string | null = null;
        const crumbs: { id: string | null, name: string, slug: string | null }[] = [{ id: null, name: 'Home', slug: null }];

        for (const slug of slugPath) {
            let sanitizedParentId = parentId === 'null' ? null : parentId;
            console.log(`Resolving folder for slug: ${slug}, userId: ${userId}, parentId: ${sanitizedParentId}`);

            let query = supabase
                .from('folders')
                .select('id, name, slug')
                .eq('slug', slug)
                .eq('user_id', userId);


            if (sanitizedParentId === null) {
                sanitizedParentId = await getRootId(userId);
                // Ensure root ID is fetched before querying with it
                if (!sanitizedParentId) {
                    console.error("Could not fetch root folder ID for user:", userId);
                    return { folderId: null, breadcrumbs: crumbs }; // Or handle error appropriately
                }
                query = query.eq('parent_id', sanitizedParentId);
            } else {
                query = query.eq('parent_id', sanitizedParentId);
            }
            if (!parentFolderId) {
                setParentFolderId(sanitizedParentId);
            }
            const result = await query.single();

            const data = result.data as Pick<Folder, 'id' | 'name' | 'slug'> | null;
            const error = result.error;

            if (error || !data) {
                console.warn(`Folder not found for slug: ${slug}, parentId: ${sanitizedParentId}`, error);
                // If a folder in the path is not found, stop resolving and return null
                return { folderId: null, breadcrumbs: crumbs };
            }

            crumbs.push({ id: data.id, name: data.name, slug: data.slug });
            parentId = data.id;
        }

        return { folderId: parentId, breadcrumbs: crumbs };
    };

    const fetchData = async (userId: string, slugPath: string[]) => {
        setIsLoading(true);
        try {
            let { folderId, breadcrumbs: resolvedBreadcrumbs } = await resolveFolderPath(userId, slugPath);

            // If the path is valid but leads nowhere (e.g., /books/non-existent-folder)
            // or if the path is invalid from the start (e.g., /books/invalid/path)
            if (slugPath.length > 0 && folderId === null) {
                console.warn(`Path resolution failed for slugs: ${slugPath.join('/')}. Redirecting to /books.`);
                router.push('/books');
                return; // Stop execution here
            }

            setIsRoot(false);
            if (folderId === null && slugPath.length === 0) { // Only set root if no slugs and folderId is null
                const rootId = await getRootId(userId);
                if (rootId) {
                    folderId = rootId;
                    setIsRoot(true);
                    // Ensure breadcrumbs only contain 'Home' for the root
                    resolvedBreadcrumbs = [{ id: null, name: 'Home', slug: null }];
                } else {
                    console.error("Root folder ID not found for user:", userId);
                    // Handle case where root folder doesn't exist or couldn't be fetched
                    router.push('/signin'); // Or show an error message
                    return;
                }
            }

            setCurrentFolderId(folderId);
            setBreadcrumbs(resolvedBreadcrumbs);

            console.log("Folder ID:", folderId);
            if (folderId) { // Fetch content only if we have a valid folder ID
                const combined = await fetchUserBooksAndFolders(userId, folderId);
                setBooks(combined);
                console.log("Fetched books and folders:", combined);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Optionally redirect to a safe page or show an error message
            router.push('/books');
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/signin');
                    return;
                }
                setUserId(user.id);
            } catch (error) {
                console.error("Auth Error:", error);
                router.push('/signin');
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [router]);

    useEffect(() => {
        if (userId) {
            fetchData(userId, slugArray);
        }
    }, [userId, slugArray.join('/')]);


    const handleFolderClick = (folderId: string) => {
        console.log("Books:", books);
        const clickedFolder = books.find(item => item.isFolder && item.id === folderId) as Folder | undefined;

        if (clickedFolder?.slug) {
            const newPath = [...slugArray, clickedFolder.slug].join('/');
            router.push(`/books/${newPath}`);
        } else if (folderId) {
            // handle up function
            if (breadcrumbs.length > 1) {
                const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
                handleBreadcrumbClick(parentCrumb);
            } else {
                router.push('/books');
            }
        }
    };

    const handleBreadcrumbClick = (crumb: { id: string | null, slug: string | null }) => {
        if (!userId) return;
        const index = breadcrumbs.findIndex(c => c.id === crumb.id);
        // Ensure index is valid before slicing
        if (index === -1) {
            console.error("Breadcrumb not found:", crumb);
            router.push('/books'); // Navigate to root as a fallback
            return;
        }
        const path = breadcrumbs.slice(1, index + 1).map(c => c.slug).filter(Boolean).join('/');
        router.push(path ? `/books/${path}` : '/books');
    };

    const handleCreateFolder = async () => {
        if (!userId || !currentFolderId) { // Ensure currentFolderId is also available
            console.error("User not logged in or current folder ID missing");
            return;
        }

        const folderName = window.prompt("Enter new folder name:");
        if (!folderName?.trim()) return;

        // const newSlug = slugify(folderName); // Slug generation handled by createFolder
        setIsLoading(true);
        try {
            await createFolder(folderName, userId, currentFolderId); // Pass currentFolderId as parent
            await fetchData(userId, slugArray); // Refresh current view
        } catch (error) {
            console.error('Error creating folder:', error);
            alert(`Failed to create folder. ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFolder = async () => {
        if (!userId || !currentFolderId || isRoot) {
            console.error("Cannot delete: User not logged in, folder ID missing, or trying to delete root.");
            return;
        }

        const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name || 'this folder';
        const confirmation = window.confirm(`Are you sure you want to delete "${currentFolderName}" and all its contents? This action cannot be undone.`);

        if (!confirmation) return;

        setIsDeleting(true);
        setIsLoading(true); // Also set general loading state
        try {
            await deleteFolder(currentFolderId, userId);

            // Navigate to the parent folder after deletion
            const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
            if (parentCrumb) {
                handleBreadcrumbClick(parentCrumb);
            } else {
                router.push('/books'); // Go to root if parent doesn't exist (shouldn't happen if not root)
            }
            // No need to call fetchData here as navigation will trigger it
        } catch (error) {
            console.error('Error deleting folder:', error);
            alert(`Failed to delete folder. ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
            setIsLoading(false);
        }
    };


    if (isLoading && !books.length && !isDeleting) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-grey3 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-foreground mb-8">📚 Dashboard</h1>
                    {/* Basic Loading Spinner */}
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-grey3 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-foreground">📚 Dashboard</h1>
                    {/* Delete Button - Conditionally Rendered */}
                    {!isRoot && currentFolderId && (
                        <button
                            onClick={handleDeleteFolder}
                            disabled={isLoading || isDeleting}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                            title={`Delete folder: ${breadcrumbs[breadcrumbs.length - 1]?.name}`}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Folder
                                </>
                            )}
                        </button>
                    )}
                </div>


                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && ( // Show breadcrumbs even if only 'Home' is present
                    <div className="mb-6">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-2 text-sm">
                                {breadcrumbs.map((crumb, index) => (
                                    <li key={crumb.id || 'home'}>
                                        <div className="flex items-center">
                                            {index > 0 && (
                                                <svg className="h-4 w-4 text-grey2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <button
                                                onClick={() => handleBreadcrumbClick(crumb)}
                                                className={`ml-2 text-sm font-medium ${index === breadcrumbs.length - 1
                                                    ? 'text-foreground cursor-default' // Current folder is not clickable
                                                    : 'text-grey2 hover:text-primary'
                                                    }`}
                                                disabled={index === breadcrumbs.length - 1} // Disable click on the last crumb
                                                aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                                            >
                                                {crumb.name}
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={handleCreateFolder}
                        disabled={isLoading || isDeleting || !currentFolderId} // Disable if loading, deleting, or no folder context
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                    >
                        {isLoading && !isDeleting ? ( // Show generic loading only if not deleting
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Create Folder'
                        )}
                    </button>
                    <Link
                        href="/search"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Search for Books
                    </Link>
                </div>

                {/* Content Area */}
                {/* Show loading spinner centrally if loading state is active */}
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                )}

                {!isLoading && books.length === 0 && (
                    <div className="text-center py-6 rounded-lg bg-background border border-grey4">
                        <p className="text-grey2">This folder is empty.</p>
                    </div>
                )}

                {!isLoading && ( // Only render BookList if not loading and books exist
                    <div className="rounded-lg bg-background p-6 border border-grey4 shadow-sm">
                        <BookList
                            items={books}
                            onFolderClick={handleFolderClick}
                            folderId={currentFolderId}
                            // Calculate parentFolderId and slug more robustly
                            parentFolderId={parentFolderId}
                            parentFolderSlug={breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].slug : null}
                            refresh={() => {
                                if (userId) fetchData(userId, slugArray);
                            }}
                            isRoot={isRoot}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}