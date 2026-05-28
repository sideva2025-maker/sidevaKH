export class BaseRepository {
    constructor(client) {
        this.client = client;
    }

    async findAll(table) {
        return await this.client.from(table).select('*');
    }

    async findById(table, id) {
        return await this.client.from(table).select('*').eq('id', id).single();
    }
}