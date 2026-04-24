import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export interface Branch {
  id: number;
  name: string;
  full_name: string;
}

let cachedBranches: Branch[] | null = null;
let isFetching = false;
let fetchPromise: Promise<Branch[]> | null = null;

export const useBranches = () => {
    const [branches, setBranches] = useState<Branch[]>(cachedBranches || []);
    const [loading, setLoading] = useState(!cachedBranches);

    useEffect(() => {
        if (cachedBranches) {
            setBranches(cachedBranches);
            setLoading(false);
            return;
        }

        if (!isFetching) {
            isFetching = true;
            fetchPromise = fetch(`${API_BASE_URL}/api/branches`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        cachedBranches = data;
                    } else {
                        cachedBranches = [];
                    }
                    isFetching = false;
                    return cachedBranches;
                })
                .catch(err => {
                    isFetching = false;
                    console.error("Failed to fetch branches", err);
                    return [];
                });
        }

        if (fetchPromise) {
            fetchPromise.then(data => {
                setBranches(data);
                setLoading(false);
            });
        }
    }, []);

    const refetch = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/branches`);
            const data = await res.json();
            if (Array.isArray(data)) {
                cachedBranches = data;
                setBranches(data);
            }
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return { 
        branches, 
        branchOptions: branches.map(b => b.name), 
        loading, 
        refetch 
    };
};
