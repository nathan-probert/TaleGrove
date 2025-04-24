'use client';

import { useEffect, useState } from 'react';
import BookList from '@/components/dashboard/BookList';
import { BookOrFolder, Folder } from '@/types';
import { fetchUserBooksAndFolders } from '@/lib/getBooks';
import supabase, { createFolder, getRootId, deleteFolder, getCurrentUser } from '@/lib/supabase'; // Import deleteFolder
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react'; // Import Trash2 icon


export default function Books() {
    const params = useParams();
    const slugArray = params?.slug ? (Array.isArray(params.slug) ? params.slug : [params.slug]) : [];

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
            let query = supabase
                .from('folders')
                .select('id, name, slug')
                .eq('slug', slug)
                .eq('user_id', userId);

            // Handle root folder case
            if (parentId === null) {
                parentId = await getRootId(userId);
            } 

            query = query.eq('parent_id', parentId);
            if (!parentFolderId) {
                setParentFolderId(parentId);
            }
            const result = await query.single();
            const data = result.data as Pick<Folder, 'id' | 'name' | 'slug'> | null;

            if (!data) {
                console.warn(`Folder not found for slug: ${slug}, parentId: ${parentId}`);
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

            // For invalid paths, redirect to /books
            if (slugPath.length > 0 && folderId === null) {
                console.warn(`Path resolution failed for slugs: ${slugPath.join('/')}. Redirecting to /books.`);
                router.push('/books');
                return;
            }

            // Handle root
            setIsRoot(false);
            if (folderId === null && slugPath.length === 0) {
                folderId = await getRootId(userId);
                setIsRoot(true);
                resolvedBreadcrumbs = [{ id: null, name: 'Home', slug: null }];
            }

            setCurrentFolderId(folderId);
            setBreadcrumbs(resolvedBreadcrumbs);

            if (folderId) {
                const combined = await fetchUserBooksAndFolders(userId, folderId);
                setBooks(combined);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            router.push('/books');
        } finally {
            setIsLoading(false);
        }
    };


    // Check if user is logged in and fetch data
    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            try {
                const user = await getCurrentUser();
                if (!user) {
                    router.push('/signin');
                    return;
                }
                setUserId(user.id);
                await fetchData(user.id, slugArray);
            } catch (error) {
                console.error("Auth Error:", error);
                router.push('/signin');
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [router, slugArray.join('/')]);


    // Handle folder click (pass this down to BookList)
    const handleFolderClick = (folderId: string) => {
        const clickedFolder = books.find(item => item.isFolder && item.id === folderId) as Folder | undefined;

        if (clickedFolder?.slug) {
            const newPath = [...slugArray, clickedFolder.slug].join('/');
            router.push(`/books/${newPath}`);
        } else if (folderId) {
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

        // Handle root
        if (index === -1) {
            router.push('/books');
            return;
        }
        const path = breadcrumbs.slice(1, index + 1).map(c => c.slug).filter(Boolean).join('/');
        router.push(path ? `/books/${path}` : '/books');
    };

    const handleCreateFolder = async () => {
        if (!userId || !currentFolderId) {
            console.error("User not logged in or current folder ID missing");
            return;
        }

        const folderName = window.prompt("Enter new folder name:");
        if (!folderName?.trim()) return;

        setIsLoading(true);
        try {
            await createFolder(folderName, userId, currentFolderId);
            await fetchData(userId, slugArray);
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
        setIsLoading(true);
        try {
            await deleteFolder(currentFolderId, userId);
            const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
            if (parentCrumb) {
                handleBreadcrumbClick(parentCrumb);
            } else {
                router.push('/books');
            }
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
            <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <h1 className="text-3xl font-bold text-foreground">📚 Dashboard</h1>
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground">
                            📚 Dashboard
                        </h1>
                        
                        {/* Breadcrumbs */}
                        {breadcrumbs.length > 1 && (
                            <nav className="flex" aria-label="Breadcrumb">
                                <ol className="flex items-center space-x-2 text-sm">
                                    {breadcrumbs.map((crumb, index) => (
                                        <li key={crumb.id || 'home'} className="flex items-center">
                                            {index > 0 && (
                                                <svg 
                                                    className="h-4 w-4 text-grey2 flex-shrink-0" 
                                                    fill="currentColor" 
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <button
                                                onClick={() => handleBreadcrumbClick(crumb)}
                                                className={`text-sm font-medium ${
                                                    index === breadcrumbs.length - 1
                                                        ? 'text-foreground cursor-default'
                                                        : 'text-grey2 hover:text-primary transition-colors'
                                                }`}
                                                disabled={index === breadcrumbs.length - 1}
                                            >
                                                {crumb.name}
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            </nav>
                        )}
                    </div>
    
                    {/* Delete Button */}
                    {!isRoot && currentFolderId && (
                        <button
                            onClick={handleDeleteFolder}
                            disabled={isLoading || isDeleting}
                            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
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
    
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleCreateFolder}
                        disabled={isLoading || isDeleting || !currentFolderId}
                        className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-foreground bg-primary hover:scale-105 transition-transform duration-200 ease-in-out">
                        {isLoading && !isDeleting ? (
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
                        className="inline-flex items-center px-6 py-3 rounded-md shadow-sm text-base font-medium text-foreground bg-secondary hover:scale-105 transition-transform duration-200 ease-in-out transform-gpu">
                        Search for Books
                    </Link>
                </div>
    
                {/* Content Area */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {books.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-grey2">This folder is empty. Start by adding some books!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <BookList
                                    items={books}
                                    onFolderClick={handleFolderClick}
                                    folderId={currentFolderId}
                                    parentFolderId={parentFolderId}
                                    parentFolderSlug={breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].slug : null}
                                    refresh={() => userId && fetchData(userId, slugArray)}
                                    isRoot={isRoot}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}