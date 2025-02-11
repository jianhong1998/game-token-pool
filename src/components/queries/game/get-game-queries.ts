import {
  getAllGames,
  IGetAllGamesResponse,
} from '@/app/game/actions/fetch-games';
import { useQuery } from '@tanstack/react-query';

interface IGetAllGamesParams {
  username: string | undefined;
  poolPublicKey: string | undefined;
}

export const useGetAllGames = (params: IGetAllGamesParams) => {
  const { poolPublicKey, username } = params;

  return useQuery<IGetAllGamesResponse[], Error>({
    enabled: Boolean(poolPublicKey) && Boolean(username),
    queryKey: ['game', 'all', { username }],
    queryFn: async () => {
      return await getAllGames({
        poolPublicKey: poolPublicKey ?? '',
        username: username ?? '',
      });
    },
    staleTime: 5_000,
    gcTime: 5_000,
    refetchInterval: 5_000,
    retryOnMount: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
};
