import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { purchase, type PurchaseResult } from './service.js';
import { PurchaseRequestDto } from './dto/PurchaseRequest.dto.js';
import { validateDto, ApiError, type ApiErrorResponse, type ApiSuccessResponse } from '@/shared/index.js';

type PurchaseResponse = ApiSuccessResponse<PurchaseResult> | ApiErrorResponse;

async function purchaseHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<PurchaseResponse> {
  // Validate request body
  const validation = await validateDto(PurchaseRequestDto, request.body);

  if (!validation.success) {
    const error = ApiError.validationError(validation.errors);
    return await reply.status(error.statusCode).send(error.toResponse());
  }

  const { userId, productId } = validation.data;

  try {
    const result = await purchase(userId, productId);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    let apiError: ApiError;

    if (message === 'NotFound') {
      apiError = ApiError.notFound('User or product');
    } else if (message === 'INSUFFICIENT_FUNDS') {
      apiError = ApiError.insufficientFunds();
    } else if (message === 'CONCURRENT_MODIFICATION') {
      apiError = ApiError.conflict('Concurrent modification detected, please retry');
    } else {
      request.log.error(err, 'Purchase failed');
      apiError = ApiError.internalError();
    }

    return await reply.status(apiError.statusCode).send(apiError.toResponse());
  }
}

export const purchaseRoutes: FastifyPluginAsync = async (app): Promise<void> => {
  app.post<{
    Body: unknown;
    Reply: PurchaseResponse;
  }>('/purchase', purchaseHandler);

  await Promise.resolve();
};
