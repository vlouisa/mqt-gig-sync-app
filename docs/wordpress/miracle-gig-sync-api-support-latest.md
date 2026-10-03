``` php
<?php

/**
 * Plugin Name: Miracle Gig Sync API Support
 * Description: Adds WordPress REST API support for Miracle Queen Tribute event data.
 * Version: 0.2.7
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
 * Sanitize a Google Maps iframe embed.
 *
 * Only iframe markup pointing to Google Maps is allowed.
 *
 * @param string $value Raw embed code.
 * @return string Sanitized embed code, or an empty string when invalid.
 */
function miracle_gig_sync_sanitize_google_map_embed( $value ) {
    if ( ! is_string( $value ) ) {
        return '';
    }

    $allowed_html = array(
        'iframe' => array(
            'src'             => true,
            'width'           => true,
            'height'          => true,
            'frameborder'     => true,
            'scrolling'       => true,
            'marginheight'    => true,
            'marginwidth'     => true,
            'id'              => true,
            'style'           => true,
            'allowfullscreen' => true,
            'loading'         => true,
            'referrerpolicy'  => true,
            'title'           => true,
        ),
    );

    $sanitized = wp_kses( $value, $allowed_html );

    if ( ! preg_match( '/<iframe[^>]+src=["\']([^"\']+)["\']/i', $sanitized, $matches ) ) {
        return '';
    }

    $src = esc_url_raw( html_entity_decode( $matches[1] ) );

    if ( ! $src ) {
        return '';
    }

    $host = wp_parse_url( $src, PHP_URL_HOST );

    if (
        ! in_array(
            $host,
            array(
                'www.google.com',
                'maps.google.com',
            ),
            true
        )
    ) {
        return '';
    }

    return $sanitized;
}

/**
 * Register selected Wolf Events metadata for use through the WordPress REST API.
 *
 * Note:
 * _wolf_event_time is intentionally not exposed yet.
 *
 * _wolf_event_map contains iframe HTML and is therefore registered
 * separately with a dedicated sanitizer.
 */
function miracle_gig_sync_register_event_meta() {
    $text_meta_fields = array(
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

    foreach ( $text_meta_fields as $meta_key ) {
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

    register_post_meta(
        'event',
        '_wolf_event_map',
        array(
            'type'              => 'string',
            'single'            => true,
            'show_in_rest'      => true,
            'sanitize_callback' => 'miracle_gig_sync_sanitize_google_map_embed',
            'auth_callback'     => function() {
                return current_user_can( 'edit_posts' );
            },
        )
    );
}
add_action( 'init', 'miracle_gig_sync_register_event_meta', 20 );
```