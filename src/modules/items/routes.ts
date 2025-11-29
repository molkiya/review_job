import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getItems, type PublicItem } from './service.js';
import { ApiError, type ApiErrorResponse, type ApiSuccessResponse } from '@/shared/index.js';

type ItemsResponse = ApiSuccessResponse<PublicItem[]> | ApiErrorResponse;

async function getItemsHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ItemsResponse> {
  try {
    const items = await getItems();
    return { success: true, data: items };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    let apiError: ApiError;

    if (message === 'SkinportFetchFailed' || message === 'SkinportRateLimited') {
      apiError = ApiError.externalServiceError('Skinport');
    } else {
      request.log.error(err);
      apiError = ApiError.internalError();
    }

    return await reply.status(apiError.statusCode).send(apiError.toResponse())
  }
}

export const itemsRoutes: FastifyPluginAsync = async (app): Promise<void> => {
  app.get<{
    Reply: ItemsResponse;
  }>('/items', getItemsHandler);

  await Promise.resolve();
};
