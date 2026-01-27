import {Observable, of} from "rxjs";

import {WebReaction} from "../../services/utils/rest.service";

export class MockRestService {
    public sendRequest(_url: string): Observable<WebReaction> {
        return of(new WebReaction(true, null, null));
    }
}
