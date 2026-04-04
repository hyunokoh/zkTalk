import * as friendRepo from './friend.repository.js';
import { AppError } from '../../lib/errors.js';
import { realtimeService } from '../realtime/realtime.service.js';

export async function sendFriendRequest(requesterId: string, addresseeId: string) {
  if (requesterId === addresseeId) {
    throw AppError.badRequest('You cannot send a friend request to yourself');
  }

  const existing = await friendRepo.findFriendship(requesterId, addresseeId);
  if (existing) {
    if (existing.status === 'blocked') {
      throw AppError.forbidden('Cannot send friend request');
    }
    if (existing.status === 'accepted') {
      throw AppError.conflict('You are already friends');
    }
    if (existing.status === 'pending') {
      // If the other user already sent a request, auto-accept
      if (existing.requesterId === addresseeId) {
        return friendRepo.updateFriendshipStatus(existing.id, 'accepted');
      }
      throw AppError.conflict('Friend request already sent');
    }
  }

  return friendRepo.createFriendRequest(requesterId, addresseeId);
}

export async function acceptFriendRequest(friendshipId: string, userId: string) {
  const friendship = await friendRepo.findById(friendshipId);
  if (!friendship) {
    throw AppError.notFound('Friend request not found');
  }

  if (friendship.addresseeId !== userId) {
    throw AppError.forbidden('You can only accept requests sent to you');
  }

  if (friendship.status !== 'pending') {
    throw AppError.badRequest('This request is not pending');
  }

  return friendRepo.updateFriendshipStatus(friendshipId, 'accepted');
}

export async function removeFriend(friendshipId: string, userId: string) {
  const friendship = await friendRepo.findById(friendshipId);
  if (!friendship) {
    throw AppError.notFound('Friendship not found');
  }

  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
    throw AppError.forbidden('You are not part of this friendship');
  }

  await friendRepo.deleteFriendship(friendshipId);
}

export async function blockUser(friendshipId: string, userId: string) {
  const friendship = await friendRepo.findById(friendshipId);
  if (!friendship) {
    throw AppError.notFound('Friendship not found');
  }

  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
    throw AppError.forbidden('You are not part of this friendship');
  }

  return friendRepo.updateFriendshipStatus(friendshipId, 'blocked');
}

export async function listFriends(userId: string, status?: 'pending' | 'accepted' | 'blocked') {
  const friends = await friendRepo.listFriends(userId, status);
  return friends.map((friend) => ({
    ...friend,
    isOnline: friend.user ? realtimeService.isUserOnline(friend.user.id) : false,
  }));
}

export async function checkFriendship(userId: string, otherUserId: string) {
  return friendRepo.checkFriendshipStatus(userId, otherUserId);
}

export async function searchUsers(userId: string, query: string, limit?: number) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  return friendRepo.searchUsers(trimmedQuery, userId, limit);
}
