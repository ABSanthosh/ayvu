import { render, screen } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import Header from '../Header.svelte';
import { setContext } from 'svelte';

const mockUser = {
	id: '1',
	name: 'Test User',
	email: 'test@example.com',
	picture: 'https://example.com/avatar.png'
};

test('renders for a logged-in user', () => {
	setContext('user', { user: mockUser });
	render(Header);

	expect(screen.getByText('ayvu')).toBeInTheDocument();
	expect(screen.getByText('Features')).toBeInTheDocument();
	expect(screen.getByText('About')).toBeInTheDocument();
	expect(screen.getByText('Dashboard')).toBeInTheDocument();
	expect(screen.queryByText('Get Started')).not.toBeInTheDocument();
});

test('renders for a logged-out user', () => {
	setContext('user', { user: null });
	render(Header);

	expect(screen.getByText('ayvu')).toBeInTheDocument();
	expect(screen.getByText('Features')).toBeInTheDocument();
	expect(screen.getByText('About')).toBeInTheDocument();
	expect(screen.getByText('Get Started')).toBeInTheDocument();
	expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
});
