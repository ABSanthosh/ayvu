<script lang="ts">
	import Modal from '../Modal.svelte';

	let { showModal = $bindable() }: { showModal: boolean } = $props();
</script>

<Modal bind:showModal header="Test Modal">
	<div>Modal Content</div>
</Modal>
