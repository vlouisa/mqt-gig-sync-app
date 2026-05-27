/**
 * Centrale configuratie voor het Miracle Queen Tribute Gig Sync systeem.
 *
 * Bevat:
 * - namen van gebruikte sheets;
 * - Google Calendar-koppeling;
 * - auto-sync instellingen;
 * - mapping van kolomnamen;
 * - toegestane syncstatussen;
 * - notificatieconfiguratie.
 */
const CONFIG = {
  /** Naam van het append-only auditlog-tabblad. */
  auditLog: {
    sheetName: 'audit-log',
    actionColumnIndex: 2
  },
  /** Google Calendar ID van de centrale bandagenda. */
  calendarId: appPropertiesService.getCalendarId(),

  /** Account dat beheeracties mag uitvoeren. */
  adminEmail: appPropertiesService.getAdminEmail(),

  /** Instellingen voor automatische publicatie naar Calendar. */
  autoSync: {
    /** Ondersteunde waarden: 1, 5, 10, 15 of 30 minuten. */
    everyMinutes: 5
  },

  /**
   * Domeinconfiguratie per type record.
   */
  entities: {
    gig: {
      columns: {
        gigId: 'Gig ID',
        gigStatus: 'Gig Status',
        title: 'Title',
        date: 'Date',
        start: 'Start',
        end: 'End',
        location: 'Location',
        description: 'Description',
        soundEngineer: 'Sound Engineer',
        syncStatus: 'SyncStatus',
        calendarEventId: 'CalendarEventId',
        lastSyncedAt: 'LastSyncedAt',
        lastError: 'LastError',
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
      },
      technicalColumnKeys: [
        'gigId',
        'calendarEventId',
        'lastSyncedAt',
        'lastError',
        'createdAt',
        'updatedAt'
      ],
      sheetName: 'gig-input',
      syncStatusColumnIndex: 9
    },

    flight: {
      columns: {
        departureDate: 'Departure Date',
        departureTime: 'Departure Time',
        departureAirport: 'Departure Airport',
        arrivalDate: 'Arrival Date',
        arrivalTime: 'Arrival Time',
        arrivalAirport: 'Arrival Airport',
        arrivalLocation: 'Arrival Location',
        flightNumber: 'Flight',
        airline: 'Airline',
        description: 'Description',
        syncStatus: 'SyncStatus',
        flightId: 'Flight ID',
        calendarEventId: 'CalendarEventId',
        lastSyncedAt: 'LastSyncedAt',
        lastError: 'LastError',
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
      },
      technicalColumnKeys: [
        'flightId',
        'calendarEventId',
        'lastSyncedAt',
        'lastError',
        'createdAt',
        'updatedAt'
      ],
      mailImport: {
        lookbackDays: 7,
        maxThreads: 25,
        inboxLabel: 'Flights/Inbox',
        processedLabel: 'Flights/Processed',
        discardedLabel: 'Flights/Discarded',
        errorLabel: 'Flights/Error'
      },
      sheetName: 'flight-input',
      syncStatusColumnIndex: 10
    },

    hotel: {
      columns: {
        hotelId: 'Hotel ID',
        hotel: 'Hotel',
        country: 'Country',
        address: 'Address',
        checkInDate: 'Check-in Date',
        checkOutDate: 'Check-out Date',
        reservationReference: 'Reservation Reference',
        description: 'Description',
        syncStatus: 'SyncStatus',
        calendarEventId: 'CalendarEventId',
        lastSyncedAt: 'LastSyncedAt',
        lastError: 'LastError',
        createdAt: 'CreatedAt',
        updatedAt: 'UpdatedAt'
      },
      technicalColumnKeys: [
        'hotelId',
        'calendarEventId',
        'lastSyncedAt',
        'lastError',
        'createdAt',
        'updatedAt'
      ],
      mailImport: {
        lookbackDays: 7,
        maxThreads: 25,
        inboxLabel: 'Hotels/Inbox',
        processedLabel: 'Hotels/Processed',
        discardedLabel: 'Hotels/Discarded',
        errorLabel: 'Hotels/Error'
      },
      sheetName: 'hotel-input',
      syncStatusColumnIndex: 8
    },
    user: {
      columns: {
        name: 'Naam',
        email: 'Email',
        userId: 'User ID'
      },
      sheetName: 'user-input'
    }
  },

  /** Workflow-statussen voor publicatie naar Calendar. */
  syncStatuses: {
    draft: 'DRAFT',
    needsSync: 'NEEDS_SYNC',
    synced: 'SYNCED',
    error: 'ERROR',
    deleteRequested: 'DELETE_REQUESTED',
    deleted: 'DELETED'
  },

  /** Toegestane statusovergangen voor sync workflow. */
  syncStatusTransitions: {
    DRAFT: ['NEEDS_SYNC', ''],
    NEEDS_SYNC: ['SYNCED', 'ERROR'],
    SYNCED: ['NEEDS_SYNC', 'DELETE_REQUESTED'],
    ERROR: ['NEEDS_SYNC', 'DELETE_REQUESTED'],
    DELETE_REQUESTED: ['DELETED', 'ERROR'],
    DELETED: []
  },

  /** Workflow-statussen voor event delivery queue. */
  eventQueueStatuses: {
    pending: 'PENDING',
    processing: 'PROCESSING',
    sent: 'SENT',
    failed: 'FAILED',
    skipped: 'SKIPPED'
  },

  /** Instellingen voor event-based notificaties. */
  notifications: {
    /** Actieve notificatieprovider. */
    provider: 'PUSHOVER',
    // provider: 'MOCK', // Voor Test doeleinden.

  
    /** Tabbladnamen voor notificatieconfiguratie en queue. */
    sheets: {
      eventList: 'event-list',
      eventSubscriptions: 'event-subscriptions',
      eventQueue: 'event-queue'
    },

    /** Kolomnamen per notificatie-tabblad. */
    columns: {
      eventList: {
        eventCode: 'Event Code',
        event: 'Event',
        active: 'Active'
      },

      eventSubscriptions: {
        eventCode: 'Event Code',
        bandmember: 'Bandmember',
        active: 'Active'
      },

      eventQueue: {
        queueId: 'Queue ID',
        eventCode: 'Event Code',
        event: 'Event',
        bandmember: 'Bandmember',
        recipientProperty: 'Recipient Property',
        title: 'Title',
        message: 'Message',
        status: 'Status',
        attempts: 'Attempts',
        createdAt: 'Created At',
        processingAt: 'Processing At',
        sentAt: 'Sent At',
        lastError: 'Last Error'
      }
    },

    /** Instellingen voor de periodieke queue worker. */
    worker: {
      batchSize: 20,
      maxAttempts: 3,
      lockSeconds: 240,
      defaultStatus: 'PENDING'
    }
  },

  systemStatus: {
    sheetName: 'system-status',
    layout: {
      headerRow: 1,
      firstColumn: 1,
      firstDataRow: 2
    },
    columns: {
      component: 'Component',
      handlerFunction: 'Handler Function',
      status: 'Status',
      triggerCount: 'Trigger Count',
      lastCheckedAt: 'Last Checked At',
      recommendation: 'Recommendation'
    },
    colors: {
      statusOk: '#d9ead3',
      statusError: '#f4cccc',
      tabOk: '#6aa84f',
      tabError: '#cc0000'
    }
  }
};