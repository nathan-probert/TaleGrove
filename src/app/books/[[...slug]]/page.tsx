'use client';

import { useEffect, useState } from 'react';
import BookList from '@/components/dashboard/BookList';
import { BookOrFolder, Folder } from '@/types';
import { fetchUserBooksAndFolders } from '@/lib/getBooks';
import supabase, { createFolder, getRootId } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export default function Books() {
    const params = useParams();
    const slugArray = Array.isArray(params.slug) ? params.slug : params.slug ? [params.slug] : [];

    const [books, setBooks] = useState<BookOrFolder[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string, slug: string | null }[]>([
        { id: null, name: 'Home', slug: null }
    ]);
    const [isRoot, setIsRoot] = useState<boolean>(false);


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
                query = query.eq('parent_id', sanitizedParentId);
            }
            const result = await query.single();

            const data = result.data as Pick<Folder, 'id' | 'name' | 'slug'> | null;
            const error = result.error;

            if (error || !data) {
                console.warn(`Folder not found for slug: ${slug}`);
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
            let { folderId, breadcrumbs } = await resolveFolderPath(userId, slugPath);
            if (slugPath.length && !folderId) {
                router.push('/books');
                return;
            }
            setIsRoot(false);
            if (!folderId) {
                const { data, error } = await supabase
                    .from('folders')
                    .select('id, name, slug')
                    .eq('slug', "root")
                    .eq('user_id', userId).single();
                folderId = data?.id || null;
                setIsRoot(true);
            }
            setCurrentFolderId(folderId);
            setBreadcrumbs(breadcrumbs);

            const combined = await fetchUserBooksAndFolders(userId, folderId ?? '');
            setBooks(combined);
        } catch (error) {
            console.error('Error loading data:', error);
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
                await fetchData(user.id, slugArray);
            } catch (error) {
                console.error("Auth Error:", error);
                router.push('/signin');
            }
        };

        initializeAuth();
    }, [slugArray.join('/')]);

    const handleFolderClick = (folderId: string) => {
        if (folderId === "null") {
            router.push('/books');
            return;
        }

        const clickedFolder = books.find(item => item.isFolder && item.id === folderId) as Folder | undefined;

        if (clickedFolder?.slug) {
            const newPath = [...slugArray, clickedFolder.slug].join('/');
            router.push(`/books/${newPath}`);
        } else {
            // Try resolving via breadcrumbs (likely a "go up" folder)
            const crumbIndex = breadcrumbs.findIndex(b => b.id === folderId);
            if (crumbIndex !== -1) {
                const path = breadcrumbs
                    .slice(1, crumbIndex + 1)
                    .map(c => c.slug)
                    .filter(Boolean)
                    .join('/');
                router.push(path ? `/books/${path}` : '/books');
            } else {
                console.error(`Folder not found in books or breadcrumbs: ${folderId}`);
            }
        }
    };

    const handleBreadcrumbClick = (crumb: { id: string | null, slug: string | null }) => {
        if (!userId) return;
        const index = breadcrumbs.findIndex(c => c.id === crumb.id);
        const path = breadcrumbs.slice(1, index + 1).map(c => c.slug).filter(Boolean).join('/');
        router.push(path ? `/books/${path}` : '/books');
    };

    const handleCreateFolder = async () => {
        if (!userId) {
            console.error("User not logged in");
            return;
        }

        const folderName = window.prompt("Enter new folder name:");
        if (!folderName?.trim()) return;

        const newSlug = slugify(folderName);
        setIsLoading(true);
        try {
            await createFolder(folderName, userId, currentFolderId);
            await fetchData(userId, slugArray);
        } catch (error) {
            console.error('Error creating folder:', error);
            alert(`Failed to create folder. ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (isLoading && !books.length) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-grey3 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-foreground mb-8">📚 Dashboard</h1>
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-8 bg-grey4 rounded w-1/4"></div>
                            <div className="h-4 bg-grey4 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-grey3 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-foreground mb-8">📚 Dashboard</h1>

                {/* Breadcrumbs */}
                {breadcrumbs.length > 1 && (
                    <div className="mb-6">
                        <nav className="flex" aria-label="Breadcrumb">
                            <ol className="flex items-center space-x-2 text-sm">
                                {breadcrumbs.map((crumb, index) => (
                                    <li key={crumb.id || 'home'}>
                                        <div className="flex items-center">
                                            {index > 0 && (
                                                <svg className="h-4 w-4 text-grey2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            <button
                                                onClick={() => handleBreadcrumbClick(crumb)}
                                                className={`text-sm font-medium ${index === breadcrumbs.length - 1
                                                    ? 'text-foreground'
                                                    : 'text-grey2 hover:text-primary'
                                                    }`}
                                                disabled={index === breadcrumbs.length - 1}
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
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Folder'
                        )}
                    </button>
                    <Link href="/search">
                        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                            Search for Books
                        </button>
                    </Link>
                </div>

                {/* Content Area */}
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

                {!isLoading && (
                    <div className="rounded-lg bg-background p-6 border border-grey4 shadow-sm">
                        <BookList
                            items={books}
                            onFolderClick={handleFolderClick}
                            folderId={currentFolderId}
                            parentFolderId={breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null}
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