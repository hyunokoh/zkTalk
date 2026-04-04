/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserAvatar } from '../UserAvatar';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { alt, src, unoptimized, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement> & {
      unoptimized?: boolean;
    };
    void unoptimized;
    return <img alt={alt} src={typeof src === 'string' ? src : ''} {...rest} />;
  },
}));

describe('UserAvatar', () => {
  it('rewrites first-party asset URLs to the same-origin proxy', () => {
    render(
      <UserAvatar
        displayName="Alice Example"
        avatarUrl="http://127.0.0.1:4000/api/upload/assets/users/user-1/avatar.png"
      />,
    );

    const image = screen.getByAltText('Alice Example');
    expect(image.getAttribute('src')).toBe('/api/public-assets/users/user-1/avatar.png');
  });

  it('keeps external avatar URLs unchanged', () => {
    render(
      <UserAvatar
        displayName="Bob Example"
        avatarUrl="https://example.com/avatar.png"
      />,
    );

    const image = screen.getByAltText('Bob Example');
    expect(image.getAttribute('src')).toBe('https://example.com/avatar.png');
  });

  it('rewrites desktop API asset URLs from arbitrary hosts to the same-origin proxy', () => {
    render(
      <UserAvatar
        displayName="Carol Example"
        avatarUrl="https://desktop.zk.local:4010/api/upload/assets/users/user-1/avatar.png?v=20260401"
      />,
    );

    const image = screen.getByAltText('Carol Example');
    expect(image.getAttribute('src')).toBe('/api/public-assets/users/user-1/avatar.png?v=20260401');
  });
});
