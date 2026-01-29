import {Observable} from "rxjs";

import {WebReaction} from "../../services/utils/rest.service";

export class MockRestService {
    public sendRequest(url: string): Observable<WebReaction> {
        return null;
    }
}
