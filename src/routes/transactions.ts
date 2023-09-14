import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/check-session-id";

export async function transactionsRoutes(app: FastifyInstance) {

  app.get("/", {
    preHandler: [checkSessionIdExists]
  }, async (request) => {

    const { sessionId } = request.cookies

    const transactions = await knex("transactions").select().where({ session_id: sessionId });

    return {
      transactions,
    };
  })

  app.get("/summary", {
    preHandler: [checkSessionIdExists]
  }, async (request) => {

    const { sessionId } = request.cookies;
    const summary = await knex("transactions")
      .where({ session_id: sessionId })
      .sum("amount", { as: "amount" })
      .first();

    return { summary };
  })

  app.get("/:id", { preHandler: [checkSessionIdExists] }, async (request) => {
    const getTransactionsParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { sessionId } = request.cookies
    const { id } = getTransactionsParamsSchema.parse(request.params);

    const transaction = await knex("transactions").where({ session_id: sessionId, id }).first();

    return { transaction };
  })

  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body
    );

    let sessionId = request.cookies.sessionId;
    if (!sessionId) {
      sessionId = randomUUID();

      reply.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex("transactions").insert({
      id: randomUUID(),
      title,
      amount: type === "credit" ? amount : amount * -1,
      session_id: sessionId
    });

    return reply.status(201).send();
  });

}
