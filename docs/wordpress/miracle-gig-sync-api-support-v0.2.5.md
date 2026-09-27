# Miracle Gig Sync API Support — v0.2.5

Door de gebruiker aangeleverde pluginbroncode, opgeslagen als referentie. Opmaak-escapes uit het geplakte bericht zijn teruggezet naar gewone PHP. Deze documentatie installeert of wijzigt de externe WordPress-plugin niet.

Deze versie registreert `_wolf_event_email` en `_wolf_event_website`. `_wolf_event_time` is bewust niet geregistreerd: Start blijft beschikbaar in `website-publications`; over doorgifte naar WordPress wordt later beslist. De huidige Apps Script-mapper neemt het veld nog op in de payload, maar deze plugin stelt het niet beschikbaar via REST.

```php
<?php

/**
 * Plugin Name: Miracle Gig Sync API Support
 * Description: Adds WordPress REST API support for Miracle Queen Tribute event data.
 * Version: 0.2.5
 * Author: Miracle Queen Tribute
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Enable REST API and custom field support for Wolf Events.
 */
function miracle_gig_sync_event_post_type_args( $args, $post_type ) {
	if ( 'event' !== $post_type ) {
		return $args;
	}

	$args['show_in_rest'] = true;

	if ( ! in_array( 'custom-fields', $args['supports'], true ) ) {
		$args['supports'][] = 'custom-fields';
	}

	return $args;
}
add_filter( 'register_post_type_args', 'miracle_gig_sync_event_post_type_args', 10, 2 );

/**
 * Enable REST API support for the Wolf Events artist taxonomy.
 */
function miracle_gig_sync_artist_taxonomy_args( $args, $taxonomy ) {
	if ( 'we_artist' !== $taxonomy ) {
		return $args;
	}

	$args['show_in_rest'] = true;

	return $args;
}
add_filter( 'register_taxonomy_args', 'miracle_gig_sync_artist_taxonomy_args', 10, 2 );

/**
 * Register selected Wolf Events metadata for use through the WordPress REST API.
 *
 * Note:
 * _wolf_event_time is intentionally not exposed yet.
 * Start time remains available in the website-publications sheet, but whether
 * it should be published to WordPress will be decided separately.
 */
function miracle_gig_sync_register_event_meta() {
	$meta_fields = array(
		'_wolf_event_start_date',
		'_wolf_event_end_date',
		'_wolf_event_venue',
		'_wolf_event_location',
		'_wolf_event_city',
		'_wolf_event_country',
		'_wolf_event_country_short',
		'_wolf_event_state',
		'_wolf_event_address',
		'_wolf_event_zip',
		'_wolf_event_email',
		'_wolf_event_website',
		'_wolf_event_ticket',
		'_wolf_event_price',
		'_wolf_event_currency',
	);

	foreach ( $meta_fields as $meta_key ) {
		register_post_meta(
			'event',
			$meta_key,
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function() {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}
}
add_action( 'init', 'miracle_gig_sync_register_event_meta', 20 );
```
