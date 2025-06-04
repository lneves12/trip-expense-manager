
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

import { 
  createTripInputSchema, 
  updateTripInputSchema,
  createParticipantInputSchema,
  createExpenseInputSchema 
} from './schema';

import { createTrip } from './handlers/create_trip';
import { getTrips } from './handlers/get_trips';
import { getTrip } from './handlers/get_trip';
import { updateTrip } from './handlers/update_trip';
import { deleteTrip } from './handlers/delete_trip';
import { createParticipant } from './handlers/create_participant';
import { getTripParticipants } from './handlers/get_trip_participants';
import { deleteParticipant } from './handlers/delete_participant';
import { createExpense } from './handlers/create_expense';
import { getTripExpenses } from './handlers/get_trip_expenses';
import { deleteExpense } from './handlers/delete_expense';
import { getTripBalances } from './handlers/get_trip_balances';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Trip operations
  createTrip: publicProcedure
    .input(createTripInputSchema)
    .mutation(({ input }) => createTrip(input)),
  
  getTrips: publicProcedure
    .query(() => getTrips()),
  
  getTrip: publicProcedure
    .input(z.number())
    .query(({ input }) => getTrip(input)),
  
  updateTrip: publicProcedure
    .input(updateTripInputSchema)
    .mutation(({ input }) => updateTrip(input)),
  
  deleteTrip: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTrip(input)),

  // Participant operations
  createParticipant: publicProcedure
    .input(createParticipantInputSchema)
    .mutation(({ input }) => createParticipant(input)),
  
  getTripParticipants: publicProcedure
    .input(z.number())
    .query(({ input }) => getTripParticipants(input)),
  
  deleteParticipant: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteParticipant(input)),

  // Expense operations
  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input }) => createExpense(input)),
  
  getTripExpenses: publicProcedure
    .input(z.number())
    .query(({ input }) => getTripExpenses(input)),
  
  deleteExpense: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteExpense(input)),

  // Balance operations
  getTripBalances: publicProcedure
    .input(z.number())
    .query(({ input }) => getTripBalances(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
